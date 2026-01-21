import type { INodeProperties } from 'n8n-workflow';
import { videoIdField } from '../../shared/descriptions';

const showOnlyForSummarize = {
	resource: ['summarize'],
};

export const summarizeDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForSummarize,
		},
		options: [
			{
				name: 'Generate Summary',
				value: 'generate',
				action: 'Generate AI summary of video',
				description: 'Generate an AI-powered summary of a YouTube video transcript',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/summarize',
						body: {
							videoId: '={{$parameter.videoId}}',
							format: '={{$parameter.summaryFormat}}',
							length: '={{$parameter.summaryLength}}',
						},
					},
				},
			},
		],
		default: 'generate',
	},
	{
		...videoIdField,
		displayOptions: {
			show: showOnlyForSummarize,
		},
	},
	{
		displayName: 'Summary Format',
		name: 'summaryFormat',
		type: 'options',
		displayOptions: {
			show: showOnlyForSummarize,
		},
		options: [
			{
				name: 'Brief',
				value: 'brief',
				description: 'Short summary in 2-3 sentences',
			},
			{
				name: 'Detailed',
				value: 'detailed',
				description: 'Comprehensive summary with key points',
			},
			{
				name: 'Bullet Points',
				value: 'bullet-points',
				description: 'Summary as bullet point list',
			},
			{
				name: 'Chapters',
				value: 'chapters',
				description: 'Summary organized by video chapters',
			},
		],
		default: 'detailed',
		description: 'Format of the generated summary',
	},
	{
		displayName: 'Summary Length',
		name: 'summaryLength',
		type: 'options',
		displayOptions: {
			show: showOnlyForSummarize,
		},
		options: [
			{
				name: 'Short',
				value: 'short',
				description: '100-200 words',
			},
			{
				name: 'Medium',
				value: 'medium',
				description: '200-400 words',
			},
			{
				name: 'Long',
				value: 'long',
				description: '400-600 words',
			},
		],
		default: 'medium',
		description: 'Desired length of the summary',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForSummarize,
		},
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'en',
				description: 'Language for the summary output (leave empty for same as video)',
			},
			{
				displayName: 'Custom Prompt',
				name: 'customPrompt',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				placeholder: 'Focus on the technical aspects...',
				description: 'Additional instructions for the AI summarizer',
			},
		],
	},
];
