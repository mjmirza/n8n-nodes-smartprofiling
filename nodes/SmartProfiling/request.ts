import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';

export const DEFAULT_BASE_URL = 'https://smartprofiling.com';

export type ParamReader = (name: string, fallback?: unknown) => IDataObject[keyof IDataObject];

export interface BuiltRequest {
	method: IHttpRequestMethods;
	endpoint: string;
	qs: IDataObject;
	body: IDataObject;
	/** True when the endpoint deducts credits, so a resend after a server error could charge twice. */
	billable: boolean;
	/** Client-side transcript text layout requested in Additional Options. */
	displayFormat?: string;
}

const PRIVATE_V4 = [
	/^127\./,
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
	/^169\.254\./,
	/^0\./,
	/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
	/^(22[4-9]|2[3-5]\d)\./,
];

function isPrivateV4(host: string): boolean {
	return PRIVATE_V4.some((range) => range.test(host));
}

function isPrivateV6(host: string): boolean {
	if (host === '::' || host === '::1') return true;
	if (/^f[cd][0-9a-f]{0,2}:/.test(host) || /^fe[89ab][0-9a-f]?:/.test(host)) return true;
	const mapped = /^::ffff:(?:0:)?(.+)$/.exec(host);
	if (!mapped) return false;
	const tail = mapped[1];
	if (tail.includes('.')) return isPrivateV4(tail);
	const groups = tail.split(':');
	if (groups.length !== 2) return true;
	const hi = parseInt(groups[0], 16);
	const lo = parseInt(groups[1], 16);
	return isPrivateV4([hi >> 8, hi & 255, lo >> 8, lo & 255].join('.'));
}

function parseUrl(value: string): URL | undefined {
	try {
		return new URL(value);
	} catch {
		return undefined;
	}
}

/** The API key is only ever sent to the official domain or one of its subdomains. */
export const ALLOWED_HOST = /^([a-z0-9-]+\.)*smartprofiling\.com$/;

/** Validates the credential Base URL before the API key is sent to it (https, public host). */
export function normalizeBaseUrl(raw: unknown): string {
	const value = typeof raw === 'string' && raw.trim() ? raw.trim() : DEFAULT_BASE_URL;
	const parsed = parseUrl(value);
	if (!parsed) {
		throw new Error('Base URL is not a valid URL');
	}
	if (parsed.protocol !== 'https:') {
		throw new Error('Base URL must use https');
	}
	if (parsed.username || parsed.password) {
		throw new Error('Base URL must not contain credentials');
	}
	const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
	const bare = host.startsWith('[') ? host.slice(1, -1) : host;
	if (
		host === 'localhost' ||
		host.endsWith('.localhost') ||
		host.endsWith('.local') ||
		host.endsWith('.internal') ||
		isPrivateV4(host) ||
		(host.startsWith('[') && isPrivateV6(bare))
	) {
		throw new Error('Base URL must not point to a local or private address');
	}
	if (!ALLOWED_HOST.test(host)) {
		throw new Error('Base URL must be smartprofiling.com or one of its subdomains');
	}
	const path = parsed.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
	return `${parsed.origin}${path}`;
}

/** Builds the HTTP request for one item from the node parameters. */
export function buildRequest(
	resource: string,
	operation: string,
	get: ParamReader,
	typeVersion = 1.1,
	savedParameters: IDataObject = {},
): BuiltRequest {
	if (resource === 'transcript') {
		const options = (get('additionalOptions', {}) as IDataObject) ?? {};
		const displayFormat = typeof options.displayFormat === 'string' ? options.displayFormat : undefined;
		if (operation === 'getBulk') {
			const ids = String(get('videoIds') ?? '')
				.split('\n')
				.map((id) => normalizeVideoId(id))
				.filter((id) => id);
			return {
				method: 'POST',
				endpoint: '/api/v1/transcripts',
				qs: {},
				body: { ids, format: get('format'), ...languagesOf(get('language')) },
				billable: true,
				displayFormat,
			};
		}
		return {
			method: 'GET',
			endpoint: '/api/v1/transcripts',
			qs: { id: videoIdOf(get('videoId')), format: get('format'), language: get('language') },
			body: {},
			billable: true,
			displayFormat,
		};
	}

	if (resource === 'summarize') {
		const body: IDataObject = {
			videoId: videoIdOf(get('videoId')),
			format: get('summaryFormat'),
			length: get('summaryLength'),
		};
		const options = (get('additionalOptions', {}) as IDataObject) ?? {};
		if (options.language) body.language = options.language;
		if (options.customPrompt) body.customPrompt = options.customPrompt;
		return { method: 'POST', endpoint: '/api/v1/summarize', qs: {}, body, billable: true };
	}

	if (resource === 'chat') {
		const body: IDataObject = { videoId: videoIdOf(get('videoId')), message: get('message') };
		const conversationId = get('conversationId', '');
		if (typeof conversationId === 'string' && conversationId.trim()) {
			body.conversationId = conversationId.trim();
		}
		const options = (get('additionalOptions', {}) as IDataObject) ?? {};
		if (typeof options.maxTokens === 'number') body.maxTokens = options.maxTokens;
		if (typeof options.temperature === 'number') body.temperature = options.temperature;
		return { method: 'POST', endpoint: '/api/v1/chat', qs: {}, body, billable: true };
	}

	if (resource === 'chapters') {
		const body: IDataObject = { videoId: videoIdOf(get('videoId')), format: get('chapterFormat') };
		const options = (get('additionalOptions', {}) as IDataObject) ?? {};
		const chapterOptions: IDataObject = {};
		if (typeof options.minChapterDuration === 'number') chapterOptions.minChapterLength = options.minChapterDuration;
		if (typeof options.maxChapters === 'number') chapterOptions.maxChapters = options.maxChapters;
		if (Object.keys(chapterOptions).length > 0) body.options = chapterOptions;
		return { method: 'POST', endpoint: '/api/v1/chapters', qs: {}, body, billable: true };
	}

	if (resource === 'speakers') {
		const body: IDataObject = { videoId: videoIdOf(get('videoId')) };
		const options = (get('additionalOptions', {}) as IDataObject) ?? {};
		if (typeof options.maxSpeakers === 'number') body.maxSpeakers = options.maxSpeakers;
		return { method: 'POST', endpoint: '/api/v1/speakers', qs: {}, body, billable: true };
	}

	if (resource === 'channel') {
		const channelId = String(get('channelId') ?? '');
		if (operation === 'getStats') {
			const stats = (get('statsOptions', {}) as IDataObject) ?? {};
			const qs: IDataObject = {};
			if (stats.refresh) qs.refresh = 'true';
			if (stats.insights) qs.insights = 'true';
			return {
				method: 'GET',
				endpoint: `/api/v1/channels/${encodeURIComponent(channelId)}/stats`,
				qs,
				body: {},
				billable: true,
			};
		}
		if (operation === 'getGrowth') {
			return {
				method: 'GET',
				endpoint: `/api/v1/channels/${encodeURIComponent(channelId)}/growth`,
				qs: { period: get('period', '30d') },
				body: {},
				billable: false,
			};
		}
		let content = 'videos';
		if (operation === 'getShorts') content = 'shorts';
		if (operation === 'getPlaylists') content = 'playlists';
		const qs: IDataObject = { id: channelId, content };
		const options = (get('additionalOptions', {}) as IDataObject) ?? {};
		if (options.continuationToken) qs.continuationToken = options.continuationToken;
		return { method: 'GET', endpoint: '/api/v1/channels', qs, body: {}, billable: true };
	}

	if (resource === 'playlist') {
		const input = String(get('playlistId') ?? '').trim();
		// The API reads a full URL from `url` and a bare ID from `id`.
		const qs: IDataObject = /^https?:\/\//i.test(input) ? { url: input } : { id: input };
		// Version 1 sends a Limit only when the workflow stores one. The editor never stores the default, see docs/DESIGN-DECISIONS.md.
		const limit = get('limit', 50);
		const send = typeVersion >= 1.1 || savedParameters.limit !== undefined;
		if (send && typeof limit === 'number' && Number.isFinite(limit)) qs.limit = limit;
		return { method: 'GET', endpoint: '/api/v1/playlists', qs, body: {}, billable: true };
	}

	throw new Error(`Unsupported resource: ${resource}`);
}

/** 429 is rejected before any work, so always safe to resend. Server errors are resent only on free endpoints. */
export function isRetryable(statusCode: number | undefined, billable: boolean): boolean {
	if (statusCode === 429) return true;
	if (billable) return false;
	return statusCode !== undefined && [408, 500, 502, 503, 504].includes(statusCode);
}

/** Longest wait the node sleeps through. A longer Retry-After stops the retries instead. */
export const MAX_RETRY_WAIT_MS = 120_000;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Reduce a YouTube watch, youtu.be, shorts, live or embed URL to its video ID. Anything else is returned trimmed. */
export function normalizeVideoId(input: unknown): string {
	const text = String(input ?? '').trim();
	if (VIDEO_ID.test(text) || !/^https?:\/\//i.test(text)) return text;
	try {
		const url = new URL(text);
		const host = url.hostname.replace(/^(www|m|music)\./, '');
		let id: string | null = null;
		if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
		else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
			const [, kind, value] = url.pathname.split('/');
			id = kind === 'watch' ? url.searchParams.get('v') : ['shorts', 'live', 'embed', 'v'].includes(kind) ? value : null;
		}
		return id && VIDEO_ID.test(id) ? id : text;
	} catch {
		return text;
	}
}

/** A blank Language is left out, so the API default applies, as Get Single does. */
function languagesOf(value: unknown): IDataObject {
	const language = String(value ?? '').trim();
	return language ? { languages: [language] } : {};
}

/** Bulk transcripts are sent in batches so no request outlives its timeout while the API keeps charging. */
export const BULK_BATCH_SIZE = 20;
export const BULK_TIMEOUT_MS = 300_000;

export function chunk<T>(list: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
	return out;
}

/** A batch whose request failed after it was sent. The API may still have processed and charged it. */
export interface FailedBatch {
	ids: string[];
	message: string;
	statusCode?: number;
}

/**
 * Combine the batch responses into one Get Bulk result. A failed batch is listed as BATCH_FAILED, because it may
 * have been charged. Batches never sent are listed as NOT_PROCESSED and are safe to resend.
 */
export function mergeBulk(responses: IDataObject[], failed?: FailedBatch, notSent: string[] = []): IDataObject {
	const transcripts: unknown[] = [];
	const errors: unknown[] = [];
	const meta: IDataObject = { requested: 0, successful: 0, failed: 0, creditsUsed: 0 };
	for (const response of responses) {
		const data = (response.data ?? {}) as IDataObject;
		if (Array.isArray(data.transcripts)) transcripts.push(...data.transcripts);
		if (Array.isArray(data.errors)) errors.push(...data.errors);
		const part = (response.meta ?? {}) as IDataObject;
		for (const key of ['requested', 'successful', 'failed', 'creditsUsed']) meta[key] = Number(meta[key]) + (Number(part[key]) || 0);
		if (part.creditsRemaining !== undefined) meta.creditsRemaining = part.creditsRemaining;
	}
	const failedIds = failed?.ids ?? [];
	for (const videoId of failedIds) {
		errors.push({
			videoId,
			error: `The request for this batch failed: ${failed?.message}. It may have been processed and charged, so check your usage before retrying it.`,
			code: 'BATCH_FAILED',
			...(failed?.statusCode !== undefined ? { statusCode: failed.statusCode } : {}),
		});
	}
	for (const videoId of notSent) {
		errors.push({ videoId, error: 'Not sent, an earlier batch failed. Safe to retry.', code: 'NOT_PROCESSED' });
	}
	const unresolved = failedIds.length + notSent.length;
	meta.requested = Number(meta.requested) + unresolved;
	meta.failed = Number(meta.failed) + unresolved;
	meta.batches = responses.length + (failed ? 1 : 0);
	if (failed) {
		meta.failedBatches = 1;
		if (failed.statusCode !== undefined) meta.failedStatusCode = failed.statusCode;
	}
	return { success: !failed, data: { transcripts, ...(errors.length ? { errors } : {}) }, meta };
}

/** A whole number within [min, max]. Infinity is clamped like any number, a missing or non-numeric value uses the fallback. */
export function boundedInteger(value: unknown, min: number, max: number, fallback: number): number {
	const n = Number(value);
	if (value === undefined || value === null || value === '' || Number.isNaN(n)) return fallback;
	return Math.min(max, Math.max(min, Math.floor(n)));
}

function videoIdOf(value: unknown): string {
	return normalizeVideoId(value);
}

/** Delay before retry `attempt` (0-based), honoring a Retry-After header in seconds or as a date. */
export function retryDelayMs(attempt: number, initialDelayMs: number, retryAfter?: unknown, now = Date.now()): number {
	const header = Array.isArray(retryAfter) ? retryAfter[0] : retryAfter;
	if (header !== undefined && header !== null && header !== '') {
		const seconds = Number(header);
		if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
		const date = Date.parse(String(header));
		if (Number.isFinite(date)) return Math.max(date - now, 0);
	}
	return Math.min(initialDelayMs * Math.pow(2, attempt), 30_000);
}

/** An HTTP error status read from a full response, so its headers are kept. */
export class HttpStatusError extends Error {
	constructor(
		readonly status: number,
		readonly headers: IDataObject | undefined,
		readonly body: unknown,
	) {
		super(`Request failed with status code ${status}`);
	}
}

/** Picks the API's own error message out of a response body. */
export function apiErrorMessage(body: unknown, status: number): string {
	const b = body as { error?: { message?: unknown } | string; message?: unknown } | undefined;
	const nested = typeof b?.error === 'object' ? b.error?.message : b?.error;
	const msg = typeof nested === 'string' ? nested : typeof b?.message === 'string' ? b.message : '';
	return msg ? `${msg} (HTTP ${status})` : `Request failed with status code ${status}`;
}

/** Reads the HTTP status from an error as thrown by the n8n request helpers. */
export function statusOf(error: unknown): number | undefined {
	if (error instanceof HttpStatusError) return error.status;
	const err = error as { httpCode?: string; statusCode?: number; response?: { status?: number } };
	const raw = err?.httpCode ?? err?.statusCode ?? err?.response?.status;
	const code = Number(raw);
	return Number.isFinite(code) && code > 0 ? code : undefined;
}

/** Reads a Retry-After header from an error as thrown by the n8n request helpers. */
export function retryAfterOf(error: unknown): unknown {
	if (error instanceof HttpStatusError) return error.headers?.['retry-after'] ?? error.headers?.['Retry-After'];
	const err = error as {
		headers?: Record<string, unknown>;
		response?: { headers?: Record<string, unknown> };
		cause?: { response?: { headers?: Record<string, unknown> } };
	};
	const headers = err?.headers ?? err?.response?.headers ?? err?.cause?.response?.headers;
	return headers?.['retry-after'] ?? headers?.['Retry-After'];
}

interface Segment {
	text?: unknown;
	start?: unknown;
}

function timestamp(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const mm = String(m).padStart(2, '0');
	const ss = String(s).padStart(2, '0');
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Lays out transcript segments as Timeline, Plain, Paragraph or Sentences text. */
export function formatSegments(segments: Segment[], displayFormat: string): string {
	const clean = segments
		.map((s) => ({ text: String(s.text ?? '').trim(), start: Number(s.start) || 0 }))
		.filter((s) => s.text);
	if (displayFormat === 'timeline') {
		return clean.map((s) => `[${timestamp(s.start)}] ${s.text}`).join('\n');
	}
	const plain = clean.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
	if (displayFormat === 'sentences') {
		return (plain.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [])
			.map((s) => s.trim())
			.filter((s) => s)
			.join('\n');
	}
	if (displayFormat === 'paragraph') {
		// A new paragraph starts at a pause of 4s or more once the current one passes 200 characters.
		const paragraphs: string[] = [];
		let current: string[] = [];
		let lastStart = clean.length > 0 ? clean[0].start : 0;
		for (const s of clean) {
			if (current.length > 0 && s.start - lastStart >= 4 && current.join(' ').length > 200) {
				paragraphs.push(current.join(' '));
				current = [];
			}
			current.push(s.text);
			lastStart = s.start;
		}
		if (current.length > 0) paragraphs.push(current.join(' '));
		return paragraphs.join('\n\n');
	}
	return plain;
}

/** Adds `formattedText` to every JSON transcript in a response when a display format was chosen. */
export function applyDisplayFormat(response: unknown, displayFormat: string | undefined): unknown {
	if (!displayFormat || !response || typeof response !== 'object') return response;
	const decorate = (t: unknown) => {
		const obj = t as IDataObject;
		if (obj && Array.isArray(obj.segments)) {
			obj.formattedText = formatSegments(obj.segments as Segment[], displayFormat);
		}
	};
	const data = (response as IDataObject).data as IDataObject | undefined;
	if (data && Array.isArray(data.transcripts)) data.transcripts.forEach(decorate);
	else if (data) decorate(data);
	return response;
}
