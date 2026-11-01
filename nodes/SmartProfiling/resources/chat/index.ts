import type { INodeProperties } from 'n8n-workflow';
import { videoIdField, conversationIdField, messageField } from '../../shared/descriptions';

const showOnlyForChat = {
	resource: ['chat'],
};

export const chatDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForChat,
		},
		options: [
			{
				name: 'Send Message',
				value: 'send',
				action: 'Chat with video transcript',
				description: 'Send a message to chat with the video content using AI',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/chat',
						body: {
							videoId: '={{$parameter.videoId}}',
							message: '={{$parameter.message}}',
							conversationId: '={{$parameter.conversationId || undefined}}',
						},
					},
				},
			},
		],
		default: 'send',
	},
	{
		...videoIdField,
		displayOptions: {
			show: showOnlyForChat,
		},
	},
	{
		...messageField,
		displayOptions: {
			show: showOnlyForChat,
		},
	},
	{
		...conversationIdField,
		displayOptions: {
			show: showOnlyForChat,
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForChat,
		},
		options: [
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 500,
				description: 'Maximum number of tokens in the response. The API does not apply this setting yet.',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 1,
				},
				default: 0.7,
				description: 'Controls randomness in responses (0 = focused, 2 = creative). The API does not apply this setting yet.',
			},
		],
	},
];
