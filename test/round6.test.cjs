'use strict';
// Round-6 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const { ctx, http } = require('./fake-n8n.cjs');

const run = (c) => new SmartProfiling().execute.call(c);
const ids = (n) => Array.from({ length: n }, (_, i) => `vid${String(i).padStart(8, '0')}`);
const batchReply = (count) => ({
	success: true,
	data: { transcripts: Array.from({ length: count }, (_, i) => ({ videoId: `t${i}` })) },
	meta: { requested: count, successful: count, failed: 0, creditsUsed: count, creditsRemaining: 99 },
});

test('a blank bulk language is left out, as Get Single does', async () => {
	const c = ctx({ resource: 'transcript', operation: 'getBulk', videoIds: 'abcdefghijk', format: 'json', language: '' }, batchReply(1));
	await run(c);
	assert.equal('languages' in c.calls[0].body, false);
	const c2 = ctx({ resource: 'transcript', operation: 'getBulk', videoIds: 'abcdefghijk', format: 'json', language: 'de' }, batchReply(1));
	await run(c2);
	assert.deepEqual(c2.calls[0].body.languages, ['de']);
});

test('bulk transcripts are sent in batches of 20 with a long timeout and merged', async () => {
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: ids(45).join('\n'), format: 'json', language: 'en' },
		[batchReply(20), batchReply(20), batchReply(5)],
	);
	const out = await run(c);
	assert.deepEqual(c.calls.map((call) => call.body.ids.length), [20, 20, 5]);
	assert.ok(c.calls.every((call) => call.timeout === 300000));
	const json = out[0][0].json;
	assert.equal(json.data.transcripts.length, 45);
	assert.equal(json.meta.requested, 45);
	assert.equal(json.meta.successful, 45);
	assert.equal(json.meta.creditsUsed, 45);
	assert.equal(out[0].length, 1);
});

test('a failed later batch keeps the results already paid for and lists the rest', async () => {
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: ids(45).join('\n'), format: 'json', language: 'en' },
		[batchReply(20), http(402, {}, { error: 'Insufficient credits' })],
	);
	const out = await run(c);
	assert.equal(c.calls.length, 2);
	const json = out[0][0].json;
	assert.equal(json.data.transcripts.length, 20);
	assert.equal(json.data.errors.length, 25);
	assert.equal(json.data.errors.filter((e) => e.code === 'BATCH_FAILED').length, 20);
	assert.equal(json.data.errors.filter((e) => e.code === 'NOT_PROCESSED').length, 5);
	assert.equal(json.success, false);
	assert.equal(json.meta.requested, 45);
	assert.equal(json.meta.failed, 25);
});

test('a failed first batch reports the API error and its status', async () => {
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: ids(25).join('\n'), format: 'json', language: 'en' },
		[http(402, {}, { error: 'Insufficient credits' })],
		{ continueOnFail: true },
	);
	const out = await run(c);
	assert.equal(out[0][0].json.statusCode, 402);
});
