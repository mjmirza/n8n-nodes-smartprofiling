'use strict';
// A test context whose HTTP helper behaves like n8n's httpRequestWithAuthentication.
const { NodeApiError } = require('n8n-workflow');

const NODE = { id: 'n', name: 'Smart Profiling', type: 'x', typeVersion: 1.1, position: [0, 0], parameters: {} };

class AxiosError extends Error {
	constructor(status, headers, data) {
		super(`Request failed with status code ${status}`);
		this.isAxiosError = true;
		this.response = { status, headers, data };
	}
}

/** An HTTP reply. A plain object passed to ctx() is treated as http(200, {}, object). */
function http(status, headers = {}, body = {}) {
	return { __http: true, status, headers, body };
}

function ctx(params, responses, opts = {}) {
	const calls = [];
	const queue = Array.isArray(responses) ? [...responses] : null;
	const node = { ...NODE, typeVersion: opts.typeVersion ?? 1.1, parameters: opts.savedParameters ?? {} };
	return {
		calls,
		getInputData: () => opts.items ?? [{ json: {} }],
		getNodeParameter: (name, _i, fallback) => (name in params ? params[name] : fallback),
		getCredentials: async () => ({ apiKey: 'sp_test', baseUrl: opts.baseUrl ?? 'https://smartprofiling.com' }),
		continueOnFail: () => opts.continueOnFail ?? false,
		getNode: () => node,
		logger: { info() {}, warn() {}, debug() {}, error() {} },
		helpers: {
			httpRequestWithAuthentication: async (_cred, options) => {
				calls.push(options);
				let next = queue ? queue.shift() : responses;
				if (next instanceof Error) throw next;
				if (!next || !next.__http) next = http(200, {}, next);
				const failed = next.status >= 400;
				if (failed && !options.ignoreHttpStatusErrors) {
					// n8n wraps the Axios error, and the wrapping drops the response headers.
					throw new NodeApiError(node, new AxiosError(next.status, next.headers, next.body));
				}
				if (options.returnFullResponse) {
					return { statusCode: next.status, headers: next.headers, body: next.body };
				}
				return next.body;
			},
		},
	};
}

module.exports = { ctx, http, NODE, AxiosError };
