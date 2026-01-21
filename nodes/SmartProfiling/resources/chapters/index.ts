import type { INodeProperties } from 'n8n-workflow';
import { videoIdField } from '../../shared/descriptions';

const showOnlyForChapters = {
	resource: ['chapters'],
};

export const chaptersDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForChapters,
		},
		options: [
			{
				name: 'Generate Chapters',
				value: 'generate',
				action: 'Auto generate video chapters',
				description: 'Automatically generate chapters with timestamps from video content',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/chapters',
						body: {
							videoId: '={{$parameter.videoId}}',
							format: '={{$parameter.chapterFormat}}',
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
			show: showOnlyForChapters,
		},
	},
	{
		displayName: 'Output Format',
		name: 'chapterFormat',
		type: 'options',
		displayOptions: {
			show: showOnlyForChapters,
		},
		options: [
			{
				name: 'JSON',
				value: 'json',
				description: 'Structured JSON with timestamps and summaries',
			},
			{
				name: 'YouTube',
				value: 'youtube',
				description: 'Ready to paste into YouTube description',
			},
			{
				name: 'Markdown',
				value: 'markdown',
				description: 'Markdown formatted chapters',
			},
		],
		default: 'json',
		description: 'Format of the generated chapters',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForChapters,
		},
		options: [
			{
				displayName: 'Min Chapter Duration',
				name: 'minChapterDuration',
				type: 'number',
				default: 60,
				description: 'Minimum duration in seconds for each chapter',
			},
			{
				displayName: 'Max Chapters',
				name: 'maxChapters',
				type: 'number',
				default: 10,
				description: 'Maximum number of chapters to generate',
			},
		],
	},
];
