'use strict';
// Round-2 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const { NodeApiError } = require('n8n-workflow');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const { SmartProfilingApi } = require('../dist/credentials/SmartProfilingApi.credentials.js');
const request = require('../dist/nodes/SmartProfiling/request.js');

const NODE = { id: 'n', name: 'Smart Profiling', type: 'x', typeVersion: 1, position: [0, 0], parameters: {} };

function ctx(params, responses, opts = {}) {
	const calls = [];
	const queue = Array.isArray(responses) ? [...responses] : null;
	return {
		calls,
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, _i, fallback) => (name in params ? params[name] : fallback),
		getCredentials: async () => ({ apiKey: 'sp_test', baseUrl: opts.baseUrl ?? 'https://smartprofiling.com' }),
		continueOnFail: () => false,
		getNode: () => ({ ...NODE, typeVersion: opts.typeVersion ?? 1.1 }),
		logger: { info() {}, warn() {}, debug() {}, error() {} },
		helpers: {
			httpRequestWithAuthentication: async (_cred, options) => {
				calls.push(options);
				const next = queue ? queue.shift() : responses;
				if (next instanceof Error) throw next;
				return next;
			},
		},
	};
}

const run = (c) => new SmartProfiling().execute.call(c);

test('the credential test only reaches an allowed https host', () => {
	const expr = new SmartProfilingApi().test.request.baseURL;
	assert.equal(typeof expr, 'string');
	const fn = new Function('$credentials', `return (${expr.replace(/^=\{\{|\}\}$/g, '')});`);
	assert.equal(fn({ baseUrl: 'https://smartprofiling.com/api/v1/' }), 'https://smartprofiling.com');
	assert.equal(fn({ baseUrl: 'https://eu.smartprofiling.com' }), 'https://eu.smartprofiling.com');
	for (const bad of ['http://smartprofiling.com', 'https://127.0.0.1', 'https://localtest.me', 'https://smartprofiling.com.evil.io']) {
		assert.match(fn({ baseUrl: bad }), /\.invalid$/, bad);
	}
});

test('execution accepts only the official domain', () => {
	assert.equal(request.normalizeBaseUrl('https://eu.smartprofiling.com/'), 'https://eu.smartprofiling.com');
	for (const bad of ['https://localtest.me', 'https://smartprofiling.com.evil.io', 'https://example.com']) {
		assert.throws(() => request.normalizeBaseUrl(bad), undefined, bad);
	}
});

test('display format is offered for the JSON transcript format', () => {
	const props = new SmartProfiling().description.properties;
	const opts = props.find((p) => p.name === 'additionalOptions' && p.options?.some((o) => o.name === 'displayFormat'));
	assert.deepEqual(opts.displayOptions.show.format, ['json']);
});

test('node version 1 keeps the old playlist request without a limit', async () => {
	const c = ctx({ resource: 'playlist', operation: 'getVideos', playlistId: 'PL1', limit: 50 }, { success: true, data: {} }, { typeVersion: 1 });
	await run(c);
	assert.deepEqual(c.calls[0].qs, { id: 'PL1' });
	const c2 = ctx({ resource: 'playlist', operation: 'getVideos', playlistId: 'PL1', limit: 50 }, { success: true, data: {} }, { typeVersion: 1.1 });
	await run(c2);
	assert.deepEqual(c2.calls[0].qs, { id: 'PL1', limit: 50 });
	assert.deepEqual(new SmartProfiling().description.version, [1, 1.1]);
});

test('no Node 18.17+ only URL API is used', () => {
	const src = require('node:fs').readFileSync(require.resolve('../dist/nodes/SmartProfiling/request.js'), 'utf8');
	assert.equal(src.includes('canParse'), false);
});

test('Retry-After is honored', async () => {
	assert.equal(request.retryDelayMs(0, 100, '7'), 7000);
	const err = new NodeApiError(NODE, { message: 'x' }, { httpCode: '429' });
	err.cause = { response: { headers: { 'retry-after': '1' } } };
	const c = ctx({ resource: 'speakers', operation: 'identify', videoId: 'a' }, [err, { success: true }]);
	const started = Date.now();
	await run(c);
	assert.ok(Date.now() - started >= 900, 'waited for Retry-After');
});

test('max speakers and chat tuning are sent', async () => {
	const c = ctx({ resource: 'speakers', operation: 'identify', videoId: 'a', additionalOptions: { maxSpeakers: 3 } }, { success: true });
	await run(c);
	assert.equal(c.calls[0].body.maxSpeakers, 3);
	const c2 = ctx({ resource: 'chat', operation: 'send', videoId: 'a', message: 'hi', additionalOptions: { maxTokens: 200, temperature: 0.2 } }, { success: true });
	await run(c2);
	assert.equal(c2.calls[0].body.maxTokens, 200);
	assert.equal(c2.calls[0].body.temperature, 0.2);
});
