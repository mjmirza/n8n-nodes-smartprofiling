'use strict';
// Round-4 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const request = require('../dist/nodes/SmartProfiling/request.js');
const { ctx, http } = require('./fake-n8n.cjs');

const run = (c) => new SmartProfiling().execute.call(c);

test('a version 1 node that stores no limit keeps the 0.1.x request', async () => {
	const c = ctx(
		{ resource: 'playlist', operation: 'getVideos', playlistId: 'PL1', limit: 50 },
		{ success: true, data: {} },
		{ typeVersion: 1, savedParameters: {} },
	);
	await run(c);
	assert.deepEqual(c.calls[0].qs, { id: 'PL1' });
});

test('a version 1 node that stores limit 50 explicitly sends it', async () => {
	const c = ctx(
		{ resource: 'playlist', operation: 'getVideos', playlistId: 'PL1', limit: 50 },
		{ success: true, data: {} },
		{ typeVersion: 1, savedParameters: { limit: 50 } },
	);
	await run(c);
	assert.deepEqual(c.calls[0].qs, { id: 'PL1', limit: 50 });
});

test('a version 1 node with an explicit non-default limit sends it', async () => {
	const c = ctx(
		{ resource: 'playlist', operation: 'getVideos', playlistId: 'PL1', limit: 5 },
		{ success: true, data: {} },
		{ typeVersion: 1, savedParameters: { limit: 5 } },
	);
	await run(c);
	assert.deepEqual(c.calls[0].qs, { id: 'PL1', limit: 5 });
});

test('a bulk transcript request where every video failed is an error', async () => {
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: 'a\nb', format: 'json', language: 'en' },
		{ success: true, data: { transcripts: [], errors: [{ id: 'a', error: 'x' }] }, meta: { requested: 2, successful: 0, failed: 2 } },
	);
	await assert.rejects(run(c), /None of the 2 transcripts/);
});

test('a partly failed bulk request still returns its transcripts', async () => {
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: 'a\nb', format: 'json', language: 'en' },
		{ success: true, data: { transcripts: [{ id: 'a' }], errors: [{ id: 'b' }] }, meta: { requested: 2, successful: 1, failed: 1 } },
	);
	const out = await run(c);
	assert.equal(out[0][0].json.meta.successful, 1);
});

test('common YouTube URL shapes become a video ID', () => {
	const id = 'dQw4w9WgXcQ';
	for (const url of [
		`https://www.youtube.com/watch?v=${id}&t=10s`,
		`https://youtu.be/${id}?si=x`,
		`https://www.youtube.com/shorts/${id}`,
		`https://www.youtube.com/live/${id}`,
		`https://www.youtube.com/embed/${id}`,
		`https://m.youtube.com/watch?v=${id}`,
		id,
	]) {
		assert.equal(request.normalizeVideoId(url), id, url);
	}
});

test('video URLs are normalized in requests, including bulk', async () => {
	const c = ctx({ resource: 'chat', operation: 'send', videoId: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', message: 'hi' }, { success: true });
	await run(c);
	assert.equal(c.calls[0].body.videoId, 'dQw4w9WgXcQ');
	const c2 = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: 'https://youtu.be/dQw4w9WgXcQ\nabcdefghijk', format: 'json', language: 'en' },
		{ success: true, data: { transcripts: [] }, meta: { requested: 2, successful: 2 } },
	);
	await run(c2);
	assert.deepEqual(c2.calls[0].body.ids, ['dQw4w9WgXcQ', 'abcdefghijk']);
});

test('a Retry-After beyond the wait budget is not shortened, the node stops instead', async () => {
	assert.equal(request.retryDelayMs(0, 100, '600'), 600000);
	const c = ctx({ resource: 'speakers', operation: 'identify', videoId: 'abcdefghijk' }, [http(429, { 'retry-after': '3600' }), { success: true }]);
	const err = await run(c).catch((e) => e);
	assert.equal(c.calls.length, 1);
	assert.match(String(err.message), /Retry-After/);
});

test('the n8n save path never stores the default playlist limit', () => {
	const { NodeHelpers } = require('n8n-workflow');
	const node = new SmartProfiling();
	const base = { resource: 'playlist', operation: 'getVideos', playlistId: 'PL1' };
	const saved = (limit) =>
		NodeHelpers.getNodeParameters(node.description.properties, { ...base, limit }, false, false, null) ?? {};
	assert.equal(saved(50).limit, undefined);
	assert.equal(saved(5).limit, 5);
});
