'use strict';
// Round-7 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const { NodeHelpers } = require('n8n-workflow');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const request = require('../dist/nodes/SmartProfiling/request.js');
const { ctx, http } = require('./fake-n8n.cjs');

const run = (c) => new SmartProfiling().execute.call(c);
const ids = (n) => Array.from({ length: n }, (_, i) => `vid${String(i).padStart(8, '0')}`);
const reply = (count) => ({ success: true, data: { transcripts: Array(count).fill({}) }, meta: { requested: count, successful: count, failed: 0, creditsUsed: count } });

test('a batch that failed after it was sent is marked as possibly charged', async () => {
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: ids(40).join('\n'), format: 'json', language: 'en', retryOptions: { maxRetries: 0 } },
		[reply(20), http(504, {}, { error: 'timeout' })],
	);
	const json = (await run(c))[0][0].json;
	assert.equal(json.success, false);
	assert.equal(json.meta.failedBatches, 1);
	const failed = json.data.errors.filter((e) => e.code === 'BATCH_FAILED');
	assert.equal(failed.length, 20);
	assert.match(failed[0].error, /may have been processed and charged/);
	assert.equal(json.data.errors.some((e) => e.code === 'NOT_PROCESSED'), false);
});

test('an infinite retry count from an expression is capped at 10', async () => {
	const c = ctx(
		{ resource: 'speakers', operation: 'identify', videoId: 'abcdefghijk', retryOptions: { maxRetries: Infinity, initialDelay: 100 } },
		http(429, {}, { error: 'slow' }),
	);
	await assert.rejects(run(c));
	assert.equal(c.calls.length, 11);
});

test('retry settings are bounded and fall back when not numbers', () => {
	assert.equal(request.boundedInteger(Infinity, 0, 10, 3), 10);
	assert.equal(request.boundedInteger(-Infinity, 0, 10, 3), 0);
	assert.equal(request.boundedInteger(NaN, 0, 10, 3), 3);
	assert.equal(request.boundedInteger('x', 0, 10, 3), 3);
	assert.equal(request.boundedInteger(undefined, 0, 10, 3), 3);
	assert.equal(request.boundedInteger(25, 0, 10, 3), 10);
	assert.equal(request.boundedInteger(-2, 0, 10, 3), 0);
	assert.equal(request.boundedInteger(2.7, 0, 10, 3), 2);
});

test('blank bulk input fails without a request', async () => {
	const c = ctx({ resource: 'transcript', operation: 'getBulk', videoIds: '  \n ', format: 'json', language: 'en' }, reply(0));
	await assert.rejects(run(c), /Video IDs is empty/);
	assert.equal(c.calls.length, 0);
});

test('a Limit of 50 written as an expression is stored, so version 1 sends it', async () => {
	const node = new SmartProfiling();
	const stored = NodeHelpers.getNodeParameters(
		node.description.properties,
		{ resource: 'playlist', operation: 'getVideos', playlistId: 'PL1', limit: '={{50}}' },
		false,
		false,
		null,
	);
	assert.equal(stored.limit, '={{50}}');
	const c = ctx(
		{ resource: 'playlist', operation: 'getVideos', playlistId: 'PL1', limit: 50 },
		{ success: true, data: {} },
		{ typeVersion: 1, savedParameters: stored },
	);
	await run(c);
	assert.equal(c.calls[0].qs.limit, 50);
});
