import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { transcriptDescription } from './resources/transcript';
import { summarizeDescription } from './resources/summarize';
import { chatDescription } from './resources/chat';
import { chaptersDescription } from './resources/chapters';
import { speakersDescription } from './resources/speakers';
import { channelDescription } from './resources/channel';
import { playlistDescription } from './resources/playlist';

// Retry configuration
const RETRY_CONFIG = {
	maxRetries: 3,
	initialDelayMs: 1000,
	maxDelayMs: 10000,
	backoffMultiplier: 2,
	retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// Sleep helper
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calculate delay with exponential backoff
function getRetryDelay(attempt: number): number {
	const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
	return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

export class SmartProfiling implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Smart Profiling',
		name: 'smartProfiling',
		icon: 'file:smartprofiling.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Extract transcripts, generate AI summaries, and chat with YouTube videos',
		defaults: {
			name: 'Smart Profiling',
		},
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
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
						name: 'Speakers',
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
						displayName: 'Initial Delay (ms)',
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
		const baseUrl = (credentials.baseUrl as string) || 'https://smartprofiling.com';

		// Get retry options
		const retryOptions = this.getNodeParameter('retryOptions', 0, {}) as {
			maxRetries?: number;
			initialDelay?: number;
		};
		const maxRetries = retryOptions.maxRetries ?? RETRY_CONFIG.maxRetries;
		const initialDelay = retryOptions.initialDelay ?? RETRY_CONFIG.initialDelayMs;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				let endpoint = '';
				let method: IHttpRequestMethods = 'GET';
				let body: Record<string, unknown> = {};
				let qs: Record<string, string | number | undefined> = {};

				// Build request based on resource and operation
				if (resource === 'transcript') {
					if (operation === 'get') {
						endpoint = '/api/v1/transcripts';
						method = 'GET';
						qs = {
							id: this.getNodeParameter('videoId', itemIndex) as string,
							format: this.getNodeParameter('format', itemIndex) as string,
							language: this.getNodeParameter('language', itemIndex) as string,
						};
					} else if (operation === 'getBulk') {
						endpoint = '/api/v1/transcripts';
						method = 'POST';
						const videoIdsRaw = this.getNodeParameter('videoIds', itemIndex) as string;
						const videoIds = videoIdsRaw.split('\n').map((id) => id.trim()).filter((id) => id);
						body = {
							ids: videoIds,
							format: this.getNodeParameter('format', itemIndex) as string,
							languages: [this.getNodeParameter('language', itemIndex) as string],
						};
					}
				} else if (resource === 'summarize') {
					endpoint = '/api/v1/summarize';
					method = 'POST';
					body = {
						videoId: this.getNodeParameter('videoId', itemIndex) as string,
						format: this.getNodeParameter('summaryFormat', itemIndex) as string,
						length: this.getNodeParameter('summaryLength', itemIndex) as string,
					};
					// Add additional options if present
					const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as {
						language?: string;
						customPrompt?: string;
					};
					if (additionalOptions.language) {
						body.language = additionalOptions.language;
					}
					if (additionalOptions.customPrompt) {
						body.customPrompt = additionalOptions.customPrompt;
					}
				} else if (resource === 'chat') {
					endpoint = '/api/v1/chat';
					method = 'POST';
					body = {
						videoId: this.getNodeParameter('videoId', itemIndex) as string,
						question: this.getNodeParameter('question', itemIndex) as string,
					};
				} else if (resource === 'chapters') {
					endpoint = '/api/v1/chapters';
					method = 'POST';
					body = {
						videoId: this.getNodeParameter('videoId', itemIndex) as string,
						format: this.getNodeParameter('chapterFormat', itemIndex) as string,
					};
				} else if (resource === 'speakers') {
					endpoint = '/api/v1/speakers';
					method = 'POST';
					body = {
						videoId: this.getNodeParameter('videoId', itemIndex) as string,
					};
				} else if (resource === 'channel') {
					endpoint = '/api/v1/channels';
					method = 'GET';
					let contentType = 'videos';
					if (operation === 'getShorts') contentType = 'shorts';
					if (operation === 'getPlaylists') contentType = 'playlists';
					qs = {
						id: this.getNodeParameter('channelId', itemIndex) as string,
						content: contentType,
					};
					// Add continuation token if present
					const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as {
						continuationToken?: string;
					};
					if (additionalOptions.continuationToken) {
						qs.continuationToken = additionalOptions.continuationToken;
					}
				} else if (resource === 'playlist') {
					endpoint = '/api/v1/playlists';
					method = 'GET';
					qs = {
						id: this.getNodeParameter('playlistId', itemIndex) as string,
					};
				}

				// Execute request with retry logic
				let lastError: Error | undefined;
				let response: unknown;

				for (let attempt = 0; attempt <= maxRetries; attempt++) {
					try {
						if (attempt > 0) {
							const delay = getRetryDelay(attempt - 1);
							const adjustedDelay = (delay / RETRY_CONFIG.initialDelayMs) * initialDelay;
							this.logger.info(`Retry attempt ${attempt}/${maxRetries} after ${adjustedDelay}ms delay`);
							await sleep(adjustedDelay);
						}

						// AI operations (summarize, chat, speakers, chapters) need longer timeout
						const isAiOperation = ['summarize', 'chat', 'speakers', 'chapters'].includes(resource);
						const timeout = isAiOperation ? 120000 : 30000; // 2 min for AI, 30s for others

						const requestOptions: {
							method: IHttpRequestMethods;
							url: string;
							headers: Record<string, string>;
							qs?: Record<string, string | number | undefined>;
							body?: Record<string, unknown>;
							json: boolean;
							timeout: number;
						} = {
							method,
							url: `${baseUrl}${endpoint}`,
							headers: {
								Accept: 'application/json',
								'Content-Type': 'application/json',
								Authorization: `Bearer ${credentials.apiKey}`,
							},
							json: true,
							timeout,
						};

						if (method === 'GET' && Object.keys(qs).length > 0) {
							// Filter out undefined values
							const filteredQs: Record<string, string | number> = {};
							for (const [key, value] of Object.entries(qs)) {
								if (value !== undefined && value !== '') {
									filteredQs[key] = value;
								}
							}
							requestOptions.qs = filteredQs;
						}

						if (method === 'POST' && Object.keys(body).length > 0) {
							requestOptions.body = body;
						}

						response = await this.helpers.request(requestOptions);
						// Success - break out of retry loop
						break;
					} catch (error: unknown) {
						lastError = error as Error;
						const statusCode = (error as { statusCode?: number }).statusCode;

						// Check if error is retryable
						if (statusCode && RETRY_CONFIG.retryableStatusCodes.includes(statusCode)) {
							if (attempt < maxRetries) {
								this.logger.warn(
									`Request failed with status ${statusCode}, will retry (attempt ${attempt + 1}/${maxRetries})`,
								);
								continue;
							}
						}

						// Non-retryable error or max retries reached
						throw error;
					}
				}

				if (!response && lastError) {
					throw lastError;
				}

				// Parse response if it's a string
				let responseData: unknown = response;
				if (typeof response === 'string') {
					try {
						responseData = JSON.parse(response);
					} catch {
						responseData = { data: response };
					}
				}

				returnData.push({
					json: responseData as IDataObject,
					pairedItem: { item: itemIndex },
				});
			} catch (error: unknown) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					const statusCode = (error as { statusCode?: number }).statusCode;
					returnData.push({
						json: {
							error: errorMessage,
							statusCode,
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					throw error;
				}

				const errorMessage = error instanceof Error ? error.message : 'Request failed';
				throw new NodeApiError(this.getNode(), { message: errorMessage } as JsonObject, {
					itemIndex,
					message: errorMessage,
				});
			}
		}

		return [returnData];
	}
}
