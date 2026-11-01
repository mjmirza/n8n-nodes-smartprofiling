'use strict';
// Round-9 review fixes, run against the built node.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SmartProfiling } = require('../dist/nodes/SmartProfiling/SmartProfiling.node.js');
const { ctx } = require('./fake-n8n.cjs');

const run = (c) => new SmartProfiling().execute.call(c);
const params = { resource: 'speakers', operation: 'identify', videoId: 'abcdefghijk' };

test('a bad Base URL becomes one error item per input under Continue On Fail', async () => {
	const c = ctx(params, { success: true }, {
		baseUrl: 'http://smartprofiling.com',
		continueOnFail: true,
		items: [{ json: {} }, { json: {} }],
	});
	const out = (await run(c))[0];
	assert.equal(out.length, 2);
	assert.match(out[0].json.error, /https/);
	assert.deepEqual(out.map((item) => item.pairedItem), [{ item: 0 }, { item: 1 }]);
	assert.equal(c.calls.length, 0);
});

test('a bad Base URL still fails the run without Continue On Fail', async () => {
	const c = ctx(params, { success: true }, { baseUrl: 'http://smartprofiling.com' });
	await assert.rejects(run(c), /https/);
	assert.equal(c.calls.length, 0);
});

test('the publish job ships the tested dist instead of rebuilding', () => {
	const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'publish.yml'), 'utf8');
	const publishJob = workflow.slice(workflow.indexOf('\n  publish:'));
	assert.match(publishJob, /download-artifact/);
	assert.doesNotMatch(publishJob, /npm run build|npm ci/);
});

test('the README scopes the provenance claim to versions since 0.1.10', () => {
	const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
	assert.match(readme, /Every version since 0\.1\.10/);
});

test('the accepted credential-test exception is documented', () => {
	const note = fs.readFileSync(path.join(__dirname, '..', 'docs', 'DESIGN-DECISIONS.md'), 'utf8');
	assert.match(note, /Accepted by owner, blocked by a local file-protection policy/);
});
