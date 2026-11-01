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
				name: 'Get Growth',
				value: 'getGrowth',
				action: 'Get channel growth data',
				description: 'Get historical growth data for subscribers, views, and videos over time',
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
				name: 'Get Stats',
				value: 'getStats',
				action: 'Get channel statistics',
				description: 'Get comprehensive channel statistics including subscribers, views, and videos',
			},
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
		],
		default: 'getVideos',
	},
	{
		...channelIdField,
		displayOptions: {
			show: showOnlyForChannel,
		},
	},
	// Stats-specific options
	{
		displayName: 'Options',
		name: 'statsOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['getStats'],
			},
		},
		options: [
			{
				displayName: 'Force Refresh',
				name: 'refresh',
				type: 'boolean',
				default: false,
				description: 'Whether to bypass cache and fetch fresh data from YouTube',
			},
			{
				displayName: 'Include AI Insights',
				name: 'insights',
				type: 'boolean',
				default: false,
				description: 'Whether to include AI-powered growth insights and recommendations',
			},
		],
	},
	// Growth-specific options
	{
		displayName: 'Time Period',
		name: 'period',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['getGrowth'],
			},
		},
		options: [
			{
				name: '7 Days',
				value: '7d',
				description: 'Growth data for the last 7 days',
			},
			{
				name: '30 Days',
				value: '30d',
				description: 'Growth data for the last 30 days',
			},
			{
				name: '90 Days',
				value: '90d',
				description: 'Growth data for the last 90 days',
			},
			{
				name: '365 Days',
				value: '365d',
				description: 'Growth data for the last year',
			},
		],
		default: '30d',
		description: 'Time period for growth data',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['getVideos', 'getShorts', 'getPlaylists'],
			},
		},
		options: [
			{
				displayName: 'Continuation Token',
				name: 'continuationToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				placeholder: 'Paste continuationToken from previous response',
				hint: 'Use this to fetch the next batch of results',
				description: 'Token for pagination, copied from the previous response. The API does not apply it yet and returns the first page again.',
			},
		],
	},
];
