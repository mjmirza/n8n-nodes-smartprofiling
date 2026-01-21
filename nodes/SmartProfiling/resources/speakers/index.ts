import type { INodeProperties } from 'n8n-workflow';
import { videoIdField } from '../../shared/descriptions';

const showOnlyForSpeakers = {
	resource: ['speakers'],
};

export const speakersDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForSpeakers,
		},
		options: [
			{
				name: 'Identify Speakers',
				value: 'identify',
				action: 'Identify speakers in video',
				description: 'Identify and label different speakers in the video transcript',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/speakers',
						body: {
							videoId: '={{$parameter.videoId}}',
						},
					},
				},
			},
		],
		default: 'identify',
	},
	{
		...videoIdField,
		displayOptions: {
			show: showOnlyForSpeakers,
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForSpeakers,
		},
		options: [
			{
				displayName: 'Max Speakers',
				name: 'maxSpeakers',
				type: 'number',
				default: 5,
				description: 'Maximum number of speakers to identify',
			},
		],
	},
];
