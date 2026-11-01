import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';
import { transcriptDescription } from './resources/transcript';
import { summarizeDescription } from './resources/summarize';
import { chatDescription } from './resources/chat';
import { chaptersDescription } from './resources/chapters';
import { speakersDescription } from './resources/speakers';
import { channelDescription } from './resources/channel';
import { playlistDescription } from './resources/playlist';
import {
	applyDisplayFormat,
	buildRequest,
	isRetryable,
	MAX_RETRY_WAIT_MS,
	normalizeBaseUrl,
	retryAfterOf,
	apiErrorMessage,
	HttpStatusError,
	retryDelayMs,
	statusOf,
} from './request';

// Retry configuration
const RETRY_CONFIG = {
	maxRetries: 3,
	initialDelayMs: 1000,
};


export class SmartProfiling implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Smart Profiling',
		name: 'smartProfiling',
		icon: { light: 'file:smartprofiling.svg', dark: 'file:smartprofiling.dark.svg' },
		group: ['transform'],
		version: [1, 1.1],
		defaultVersion: 1.1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Extract transcripts, generate AI summaries, and chat with YouTube videos',
		defaults: {
			name: 'Smart Profiling',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'smartProfilingApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Channel',
						value: 'channel',
						description: 'Get videos, shorts, or playlists from a channel',
					},
					{
						name: 'Chapter',
						value: 'chapters',
						description: 'Auto-generate video chapters with timestamps',
					},
					{
						name: 'Chat',
						value: 'chat',
						description: 'Chat with video content using AI',
					},
					{
						name: 'Playlist',
						value: 'playlist',
						description: 'Get videos from a playlist',
					},
					{
						name: 'Speaker',
						value: 'speakers',
						description: 'Identify and label speakers in video transcript',
					},
					{
						name: 'Summarize',
						value: 'summarize',
						description: 'Generate AI-powered video summaries',
					},
					{
						name: 'Transcript',
						value: 'transcript',
						description: 'Extract transcripts from YouTube videos',
					},
				],
				default: 'transcript',
			},
			// Retry settings
			{
				displayName: 'Retry Options',
				name: 'retryOptions',
				type: 'collection',
				placeholder: 'Add Retry Option',
				default: {},
				options: [
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 3,
						description: 'Maximum number of retry attempts on failure (0 to disable)',
						typeOptions: {
							minValue: 0,
							maxValue: 10,
						},
					},
					{
						displayName: 'Initial Delay (Ms)',
						name: 'initialDelay',
						type: 'number',
						default: 1000,
						description: 'Initial delay before first retry in milliseconds',
						typeOptions: {
							minValue: 100,
							maxValue: 30000,
						},
					},
				],
			},
			...transcriptDescription,
			...summarizeDescription,
			...chatDescription,
			...chaptersDescription,
			...speakersDescription,
			...channelDescription,
			...playlistDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const credentials = await this.getCredentials('smartProfilingApi');
		let baseUrl: string;
		try {
			baseUrl = normalizeBaseUrl(credentials.baseUrl);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error);
		}

		const retryOptions = this.getNodeParameter('retryOptions', 0, {}) as {
			maxRetries?: number;
			initialDelay?: number;
		};
		const maxRetries = retryOptions.maxRetries ?? RETRY_CONFIG.maxRetries;
		const initialDelay = retryOptions.initialDelay ?? RETRY_CONFIG.initialDelayMs;

		// AI operations need a longer timeout.
		const isAiOperation = ['summarize', 'chat', 'speakers', 'chapters'].includes(resource);
		const timeout = isAiOperation ? 120000 : 30000;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const request = buildRequest(
					resource,
					operation,
					(name, fallback) => this.getNodeParameter(name, itemIndex, fallback) as IDataObject[keyof IDataObject],
					this.getNode().typeVersion,
					this.getNode().parameters,
				);

				const requestOptions: IHttpRequestOptions = {
					method: request.method,
					url: `${baseUrl}${request.endpoint}`,
					headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
					json: true,
					timeout,
					// n8n drops response headers when it wraps an HTTP error, so read the status here to keep Retry-After.
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
				};
				const qs: IDataObject = {};
				for (const [key, value] of Object.entries(request.qs)) {
					if (value !== undefined && value !== null && value !== '') qs[key] = value;
				}
				if (Object.keys(qs).length > 0) requestOptions.qs = qs;
				if (request.method === 'POST' && Object.keys(request.body).length > 0) {
					requestOptions.body = request.body;
				}

				let response: unknown;
				for (let attempt = 0; ; attempt++) {
					let failure: unknown;
					try {
						const full = (await this.helpers.httpRequestWithAuthentication.call(
							this,
							'smartProfilingApi',
							requestOptions,
						)) as { statusCode?: number; headers?: IDataObject; body?: unknown };
						const status = Number(full?.statusCode ?? 200);
						if (status < 400) {
							response = full?.body;
							break;
						}
						failure = new HttpStatusError(status, full?.headers, full?.body);
					} catch (error) {
						failure = error;
					}

					const statusCode = statusOf(failure);
					let waitNote = '';
					const retryable = attempt < maxRetries && isRetryable(statusCode, request.billable);
					const delay = retryable ? retryDelayMs(attempt, initialDelay, retryAfterOf(failure)) : 0;
					if (delay > MAX_RETRY_WAIT_MS) {
						waitNote = ` The API asked to wait ${Math.ceil(delay / 1000)} seconds (Retry-After), longer than this node waits.`;
					} else if (retryable) {
						this.logger.warn(
							`Request failed with status ${statusCode}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
						);
						await sleep(delay);
						continue;
					}
					if (failure instanceof HttpStatusError) {
						const body = failure.body && typeof failure.body === 'object' ? failure.body : { message: String(failure.body ?? '') };
						throw new NodeApiError(this.getNode(), body as JsonObject, {
							itemIndex,
							httpCode: String(failure.status),
							message: apiErrorMessage(failure.body, failure.status) + waitNote,
						});
					}
					throw new NodeApiError(this.getNode(), failure as JsonObject, { itemIndex });
				}

				let responseData: unknown = response;
				if (typeof response === 'string') {
					try {
						responseData = JSON.parse(response);
					} catch {
						responseData = { data: response };
					}
				}
				const meta = (responseData as IDataObject | null)?.meta as IDataObject | undefined;
				if (request.method === 'POST' && request.endpoint === '/api/v1/transcripts' && meta?.successful === 0 && Number(meta.requested) > 0) {
					throw new NodeOperationError(this.getNode(), `None of the ${meta.requested} transcripts could be retrieved`, {
						itemIndex,
						description: JSON.stringify((responseData as IDataObject).data ?? {}),
					});
				}
				responseData = applyDisplayFormat(responseData, request.displayFormat);
				if (responseData === null || typeof responseData !== 'object' || Array.isArray(responseData)) {
					responseData = { data: responseData };
				}

				returnData.push({
					json: responseData as IDataObject,
					pairedItem: { item: itemIndex },
				});
			} catch (error: unknown) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
							statusCode: statusOf(error),
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeApiError) {
					error.context = { ...error.context, itemIndex };
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
