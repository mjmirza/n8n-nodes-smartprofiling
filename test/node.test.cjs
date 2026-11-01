'use strict';
// Behavior tests for the built node. Run with `npm test` after `npm run build`.
const test = require('node:test');
const assert = require('node:assert/strict');
const { NodeApiError } = require('n8n-workflow');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const { SmartProfilingApi } = require('../dist/credentials/SmartProfilingApi.credentials.js');

const NODE = { id: 'n', name: 'Smart Profiling', type: 'x', typeVersion: 1, position: [0, 0], parameters: {} };

function ctx(params, responses, opts = {}) {
	const calls = [];
	const queue = Array.isArray(responses) ? [...responses] : null;
	return {
		calls,
		getInputData: () => opts.items ?? [{ json: {} }],
		getNodeParameter: (name, _i, fallback) => (name in params ? params[name] : fallback),
		getCredentials: async () => ({ apiKey: 'sp_test', baseUrl: opts.baseUrl ?? 'https://smartprofiling.com' }),
		continueOnFail: () => opts.continueOnFail ?? false,
		getNode: () => NODE,
		logger: { info() {}, warn() {}, debug() {}, error() {} },
		helpers: {
			httpRequestWithAuthentication: async (_cred, options) => {
				calls.push(options);
				const next = queue ? queue.shift() : responses;
				if (typeof next === 'function') return next(options);
				if (next instanceof Error) throw next;
				return next;
			},
		},
	};
}

function apiError(code, headers) {
	const err = new NodeApiError(NODE, { message: `HTTP ${code}` }, { httpCode: String(code) });
	if (headers) err.headers = headers;
	return err;
}

const run = (c) => new SmartProfiling().execute.call(c);

test('chat sends message and conversationId', async () => {
	const c = ctx(
		{ resource: 'chat', operation: 'send', videoId: 'abc', message: 'What is this about?', conversationId: 'conv-1' },
		{ success: true, data: { answer: 'x' } },
	);
	await run(c);
	assert.equal(c.calls[0].body.message, 'What is this about?');
	assert.equal(c.calls[0].body.conversationId, 'conv-1');
	assert.equal('question' in c.calls[0].body, false);
});

test('a billable POST is not resent after a 504', async () => {
	const c = ctx({ resource: 'summarize', operation: 'generate', videoId: 'abc', summaryFormat: 'brief', summaryLength: 'short', retryOptions: { initialDelay: 100 } }, apiError(504));
	await assert.rejects(run(c));
	assert.equal(c.calls.length, 1);
});

test('a 429 is resent after the Retry-After delay', async () => {
	const c = ctx(
		{ resource: 'summarize', operation: 'generate', videoId: 'abc', summaryFormat: 'brief', summaryLength: 'short', retryOptions: { initialDelay: 100 } },
		[apiError(429, { 'retry-after': '0' }), { success: true, data: { summary: 'ok' } }],
	);
	const out = await run(c);
	assert.equal(c.calls.length, 2);
	assert.equal(out[0][0].json.data.summary, 'ok');
});

test('a free endpoint is resent after a 503', async () => {
	const c = ctx(
		{ resource: 'channel', operation: 'getGrowth', channelId: 'UC1', period: '7d', retryOptions: { initialDelay: 100 } },
		[apiError(503), { success: true, data: {} }],
	);
	await run(c);
	assert.equal(c.calls.length, 2);
});

test('playlist sends the limit and routes URLs to the url parameter', async () => {
	const c = ctx(
		{ resource: 'playlist', operation: 'getVideos', playlistId: 'https://www.youtube.com/playlist?list=PL123', limit: 1 },
		{ success: true, data: {} },
	);
	await run(c);
	assert.deepEqual(c.calls[0].qs, { url: 'https://www.youtube.com/playlist?list=PL123', limit: 1 });
	const c2 = ctx({ resource: 'playlist', operation: 'getVideos', playlistId: 'PL123', limit: 5 }, { success: true, data: {} });
	await run(c2);
	assert.deepEqual(c2.calls[0].qs, { id: 'PL123', limit: 5 });
});

test('chapter limits are sent as nested options', async () => {
	const c = ctx(
		{ resource: 'chapters', operation: 'generate', videoId: 'abc', chapterFormat: 'json', additionalOptions: { minChapterDuration: 90, maxChapters: 4 } },
		{ success: true, data: {} },
	);
	await run(c);
	assert.deepEqual(c.calls[0].body.options, { minChapterLength: 90, maxChapters: 4 });
});

test('transcript display format adds formattedText', async () => {
	const segments = [
		{ text: 'Hello there.', start: 0, duration: 2 },
		{ text: 'How are you?', start: 65, duration: 2 },
	];
	const c = ctx(
		{ resource: 'transcript', operation: 'get', videoId: 'abc', format: 'json', language: 'en', additionalOptions: { displayFormat: 'timeline' } },
		{ success: true, data: { segments } },
	);
	const out = await run(c);
	assert.equal(out[0][0].json.data.formattedText, '[00:00] Hello there.\n[01:05] How are you?');
	const c2 = ctx(
		{ resource: 'transcript', operation: 'get', videoId: 'abc', format: 'json', language: 'en', additionalOptions: { displayFormat: 'sentences' } },
		{ success: true, data: { segments: [{ text: 'One. Two', start: 0 }, { text: 'still two!', start: 1 }] } },
	);
	const out2 = await run(c2);
	assert.equal(out2[0][0].json.data.formattedText, 'One.\nTwo still two!');
});

test('continue on fail keeps the HTTP status code', async () => {
	const c = ctx(
		{ resource: 'chat', operation: 'send', videoId: 'abc', message: 'hi', retryOptions: { maxRetries: 0 } },
		apiError(429),
		{ continueOnFail: true },
	);
	const out = await run(c);
	assert.equal(out[0][0].json.statusCode, 429);
});

test('a private or plain-http Base URL is rejected before any request', async () => {
	for (const baseUrl of ['http://smartprofiling.com', 'https://127.0.0.1', 'https://[::1]', 'https://10.0.0.5', 'https://169.254.169.254', 'https://api.localhost']) {
		const c = ctx({ resource: 'speakers', operation: 'identify', videoId: 'abc' }, { success: true }, { baseUrl });
		await assert.rejects(run(c), undefined, baseUrl);
		assert.equal(c.calls.length, 0, baseUrl);
	}
});

test('a Base URL with a trailing /api/v1 is normalized', async () => {
	const c = ctx({ resource: 'speakers', operation: 'identify', videoId: 'abc' }, { success: true }, { baseUrl: 'https://smartprofiling.com/api/v1/' });
	await run(c);
	assert.equal(c.calls[0].url, 'https://smartprofiling.com/api/v1/speakers');
});

test('the credential test uses an endpoint that does not deduct credits', () => {
	const req = new SmartProfilingApi().test.request;
	assert.match(req.url, /^\/api\/v1\/channels\/[^/]+\/videos$/);
	assert.equal(req.method, 'GET');
});
