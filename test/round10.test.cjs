'use strict';
// Round-10 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const request = require('../dist/nodes/SmartProfiling/request.js');
const { ctx, http } = require('./fake-n8n.cjs');
const apiError = (code) => http(code);

const run = (c) => new SmartProfiling().execute.call(c);
const ids = (n) => Array.from({ length: n }, (_, i) => `vid${String(i).padStart(8, '0')}`);
const reply = (n) => ({ success: true, data: { transcripts: Array(n).fill({}) }, meta: { requested: n, successful: n, failed: 0, creditsUsed: n } });

test('bulk batches never exceed the Free plan limit of 5 videos', async () => {
	assert.equal(request.BULK_BATCH_SIZE, 5);
	const c = ctx({ resource: 'transcript', operation: 'getBulk', videoIds: ids(6).join('\n'), format: 'json', language: 'en' }, [reply(5), reply(1)]);
	await run(c);
	assert.deepEqual(c.calls.map((call) => call.body.ids.length), [5, 1]);
});

test('the README and the operation describe growth history as needing a tracked channel', () => {
	const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
	assert.doesNotMatch(readme, /growth over 7 to 365 days for any channel/);
	assert.match(readme, /Run Get Stats first/);
	const growth = new SmartProfiling().description.properties
		.find((p) => p.name === 'operation' && p.options?.some((o) => o.value === 'getGrowth'))
		.options.find((o) => o.value === 'getGrowth');
	assert.match(growth.description, /tracked by Get Stats/);
});

test('channel lists offer no pagination token the API ignores, and never send one', async () => {
	const props = new SmartProfiling().description.properties;
	assert.equal(JSON.stringify(props).includes('continuationToken'), false);
	const c = ctx({ resource: 'channel', operation: 'getVideos', channelId: 'UC1', additionalOptions: { continuationToken: 'old' } }, { success: true, data: {} });
	await run(c);
	assert.deepEqual(c.calls[0].qs, { id: 'UC1', content: 'videos' });
});

test('playlist Get Videos states that only the first page is read', () => {
	const props = new SmartProfiling().description.properties;
	const op = props.find((p) => p.name === 'operation' && p.options?.some((o) => o.value === 'getVideos' && /playlist/i.test(o.description)));
	assert.match(op.options.find((o) => o.value === 'getVideos').description, /first page/);
	const limit = props.find((p) => p.name === 'limit');
	assert.match(limit.hint, /first page/);
});

test('Continue On Fail keeps the per-video reasons of a fully failed bulk request', async () => {
	const errors = [{ id: 'a', error: 'Video unavailable' }, { id: 'b', error: 'Timed out' }];
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: 'a\nb', format: 'json', language: 'en' },
		{ success: true, data: { transcripts: [], errors }, meta: { requested: 2, successful: 0, failed: 2 } },
		{ continueOnFail: true },
	);
	const out = await run(c);
	const json = out[0][0].json;
	assert.match(json.error, /None of the 2 transcripts/);
	assert.deepEqual(json.data.errors, errors);
	assert.equal(json.meta.failed, 2);
});

test('a single-item error under Continue On Fail carries no bulk data', async () => {
	const c = ctx(
		{ resource: 'chat', operation: 'send', videoId: 'abc', message: 'hi', retryOptions: { maxRetries: 0 } },
		apiError(429),
		{ continueOnFail: true },
	);
	const out = await run(c);
	assert.equal(out[0][0].json.statusCode, 429);
	assert.equal(out[0][0].json.data, undefined);
	assert.equal(out[0][0].json.meta, undefined);
});

test('Summary Language describes the transcript language, not a translation', () => {
	const props = new SmartProfiling().description.properties;
	const lang = props.flatMap((p) => p.options ?? []).find((o) => o.name === 'language' && /summary|transcript/i.test(o.description ?? '') && /translate/i.test(o.description ?? ''));
	assert.ok(lang, 'summary language option with corrected description');
	assert.match(lang.description, /Empty uses English/);
	assert.match(lang.description, /does not translate/);
});
