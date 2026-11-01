'use strict';
// Round-10 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const request = require('../dist/nodes/SmartProfiling/request.js');
const { ctx } = require('./fake-n8n.cjs');

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
