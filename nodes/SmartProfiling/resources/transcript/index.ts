import type { INodeProperties } from 'n8n-workflow';
import { videoIdField, videoIdsField, formatField, languageField } from '../../shared/descriptions';

const showOnlyForTranscript = {
	resource: ['transcript'],
};

export const transcriptDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForTranscript,
		},
		options: [
			{
				name: 'Get Single',
				value: 'get',
				action: 'Get transcript for a single video',
				description: 'Get transcript for a single YouTube video',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/transcripts',
						qs: {
							id: '={{$parameter.videoId}}',
							format: '={{$parameter.format}}',
							language: '={{$parameter.language}}',
						},
					},
				},
			},
			{
				name: 'Get Bulk',
				value: 'getBulk',
				action: 'Get transcripts for multiple videos',
				description: 'Get transcripts for multiple YouTube videos in one request',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/transcripts',
						body: {
							ids: '={{$parameter.videoIds.split("\\n").map(id => id.trim()).filter(id => id)}}',
							format: '={{$parameter.format}}',
							languages: '={{[$parameter.language]}}',
						},
					},
				},
			},
		],
		default: 'get',
	},
	{
		...videoIdField,
		displayOptions: {
			show: {
				...showOnlyForTranscript,
				operation: ['get'],
			},
		},
	},
	{
		...videoIdsField,
		displayOptions: {
			show: {
				...showOnlyForTranscript,
				operation: ['getBulk'],
			},
		},
	},
	{
		...formatField,
		displayOptions: {
			show: showOnlyForTranscript,
		},
	},
	{
		...languageField,
		displayOptions: {
			show: showOnlyForTranscript,
		},
	},
	// Additional options
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				...showOnlyForTranscript,
				format: ['json'],
			},
		},
		options: [
			{
				displayName: 'Display Format',
				name: 'displayFormat',
				type: 'options',
				options: [
					{
						name: 'Timeline',
						value: 'timeline',
						description: 'Text with timestamps',
					},
					{
						name: 'Plain',
						value: 'plain',
						description: 'Plain text without timestamps',
					},
					{
						name: 'Paragraph',
						value: 'paragraph',
						description: 'Text formatted as paragraphs',
					},
					{
						name: 'Sentences',
						value: 'sentences',
						description: 'Text split into sentences',
					},
				],
				default: 'plain',
				description: 'Adds a formattedText field laid out this way. Applies to the JSON format, which carries timed segments.',
			},
		],
	},
];
