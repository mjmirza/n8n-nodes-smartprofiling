import type { INodeProperties } from 'n8n-workflow';
import { channelIdField } from '../../shared/descriptions';

const showOnlyForChannel = {
	resource: ['channel'],
};

export const channelDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForChannel,
		},
		options: [
			{
				name: 'Get Videos',
				value: 'getVideos',
				action: 'Get channel videos',
				description: 'Get list of videos from a YouTube channel',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/channels',
						qs: {
							id: '={{$parameter.channelId}}',
							content: 'videos',
							continuationToken: '={{$parameter.additionalOptions.continuationToken || undefined}}',
						},
					},
				},
			},
			{
				name: 'Get Shorts',
				value: 'getShorts',
				action: 'Get channel shorts',
				description: 'Get list of shorts from a YouTube channel',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/channels',
						qs: {
							id: '={{$parameter.channelId}}',
							content: 'shorts',
							continuationToken: '={{$parameter.additionalOptions.continuationToken || undefined}}',
						},
					},
				},
			},
			{
				name: 'Get Playlists',
				value: 'getPlaylists',
				action: 'Get channel playlists',
				description: 'Get list of playlists from a YouTube channel',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/channels',
						qs: {
							id: '={{$parameter.channelId}}',
							content: 'playlists',
							continuationToken: '={{$parameter.additionalOptions.continuationToken || undefined}}',
						},
					},
				},
			},
		],
		default: 'getVideos',
	},
	{
		...channelIdField,
		displayOptions: {
			show: showOnlyForChannel,
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForChannel,
		},
		options: [
			{
				displayName: 'Continuation Token',
				name: 'continuationToken',
				type: 'string',
				default: '',
				placeholder: 'Paste continuationToken from previous response',
				hint: 'Use this to fetch the next batch of results',
				description: 'Token for pagination. Copy the continuationToken from the previous response to get more results. When hasMore is false, all results have been fetched.',
			},
		],
	},
];
