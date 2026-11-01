'use strict';
// Round-8 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const { ctx, http } = require('./fake-n8n.cjs');

const run = (c) => new SmartProfiling().execute.call(c);
const ids = (n) => Array.from({ length: n }, (_, i) => `vid${String(i).padStart(8, '0')}`);
const reply = (requested, successful) => ({
	success: true,
	data: { transcripts: Array(successful).fill({}) },
	meta: { requested, successful, failed: requested - successful, creditsUsed: successful },
});

test('a failed bulk batch keeps its HTTP status', async () => {
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: ids(10).join('\n'), format: 'json', language: 'en' },
		[reply(5, 5), http(402, {}, { error: 'Insufficient credits' })],
	);
	const json = (await run(c))[0][0].json;
	assert.equal(json.meta.failedStatusCode, 402);
	const failed = json.data.errors.filter((e) => e.code === 'BATCH_FAILED');
	assert.equal(failed.length, 5);
	assert.ok(failed.every((e) => e.statusCode === 402));
});

test('with no successes at all, the failed batch status is reported, also under Continue On Fail', async () => {
	const c = ctx(
		{ resource: 'transcript', operation: 'getBulk', videoIds: ids(10).join('\n'), format: 'json', language: 'en' },
		[reply(5, 0), http(402, {}, { error: 'Insufficient credits' })],
		{ continueOnFail: true },
	);
	const json = (await run(c))[0][0].json;
	assert.equal(json.statusCode, 402);
	assert.match(json.error, /Insufficient credits/);
});

test('retry settings are read per item', async () => {
	const c = ctx(
		{ resource: 'speakers', operation: 'identify', videoId: 'abcdefghijk' },
		[http(429, {}, { error: 'slow' }), http(429, {}, { error: 'slow' }), { success: true, second: true }],
		{ items: [{ json: { retries: 0 } }, { json: { retries: 1 } }], continueOnFail: true },
	);
	c.getNodeParameter = (name, i, fallback) => {
		if (name === 'retryOptions') return { maxRetries: i === 0 ? 0 : 1, initialDelay: 100 };
		return { resource: 'speakers', operation: 'identify', videoId: 'abcdefghijk' }[name] ?? fallback;
	};
	const out = (await run(c))[0];
	assert.equal(out[0].json.statusCode, 429);
	assert.equal(out[1].json.second, true);
	assert.equal(c.calls.length, 3);
});

test('the README links the design note with an absolute URL and documents the Node.js versions', () => {
	const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
	assert.doesNotMatch(readme, /\]\(docs\//);
	assert.match(readme, /https:\/\/github\.com\/mjmirza\/n8n-nodes-smartprofiling\/blob\/main\/docs\/DESIGN-DECISIONS\.md/);
	assert.match(readme, /24 or newer for development/);
});

test('publishing requires the behavior tests on every supported Node.js version', () => {
	const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'publish.yml'), 'utf8');
	assert.match(workflow, /node: \[20, 22, 24\]/);
	assert.match(workflow, /publish:\n\s+needs: runtime/);
});
