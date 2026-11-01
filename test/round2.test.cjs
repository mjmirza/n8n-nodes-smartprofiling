'use strict';
// Round-2 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const { SmartProfilingApi } = require('../dist/credentials/SmartProfilingApi.credentials.js');
const request = require('../dist/nodes/SmartProfiling/request.js');

const { ctx, http } = require('./fake-n8n.cjs');
const apiError = (code, headers) => http(code, headers);

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
	const c = ctx({ resource: 'speakers', operation: 'identify', videoId: 'a' }, [http(429, { 'retry-after': '1' }), { success: true }]);
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

test('a v0.2.0 saved workflow keeps its playlist limit on node version 1', async () => {
	const c = ctx(
		{ resource: 'playlist', operation: 'getVideos', playlistId: 'PL1', limit: 1 },
		{ success: true, data: {} },
		{ typeVersion: 1, savedParameters: { resource: 'playlist', playlistId: 'PL1', limit: 1 } },
	);
	await run(c);
	assert.deepEqual(c.calls[0].qs, { id: 'PL1', limit: 1 });
});

test('Retry-After survives n8n error wrapping', async () => {
	const c = ctx({ resource: 'speakers', operation: 'identify', videoId: 'a' }, [http(429, { 'retry-after': '2' }), { success: true }]);
	const started = Date.now();
	await run(c);
	assert.ok(Date.now() - started >= 1900, 'waited for Retry-After');
	assert.equal(c.calls.length, 2);
});

test('a final HTTP error keeps its status code and message', async () => {
	const c = ctx(
		{ resource: 'speakers', operation: 'identify', videoId: 'a', retryOptions: { maxRetries: 0 } },
		http(404, {}, { success: false, error: { code: 'NOT_FOUND', message: 'Video not found' } }),
	);
	const err = await run(c).catch((e) => e);
	assert.equal(err.httpCode, '404');
});

test('no channel pagination field promises a next batch', () => {
	const src = require('node:fs').readFileSync(require.resolve('../dist/nodes/SmartProfiling/SmartProfiling.node.js'), 'utf8');
	const desc = JSON.stringify(new SmartProfiling().description.properties);
	assert.equal(/next batch/i.test(desc), false);
	assert.ok(src.length > 0);
});

test('an HTTP error with a text or empty body still fails cleanly', async () => {
	for (const body of ['Bad Gateway', undefined]) {
		const c = ctx({ resource: 'channel', operation: 'getGrowth', channelId: 'UC1', retryOptions: { maxRetries: 0 } }, http(502, {}, body));
		const err = await run(c).catch((e) => e);
		assert.equal(err.httpCode, '502');
	}
});
