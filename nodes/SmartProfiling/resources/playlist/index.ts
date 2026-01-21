import type { INodeProperties } from 'n8n-workflow';
import { playlistIdField } from '../../shared/descriptions';

const showOnlyForPlaylist = {
	resource: ['playlist'],
};

export const playlistDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForPlaylist,
		},
		options: [
			{
				name: 'Get Videos',
				value: 'getVideos',
				action: 'Get playlist videos',
				description: 'Get all videos from a YouTube playlist',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/playlists',
						qs: {
							id: '={{$parameter.playlistId}}',
							limit: '={{$parameter.limit}}',
						},
					},
				},
			},
		],
		default: 'getVideos',
	},
	{
		...playlistIdField,
		displayOptions: {
			show: showOnlyForPlaylist,
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: showOnlyForPlaylist,
		},
		default: 50,
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		description: 'Max number of results to return',
	},
];
