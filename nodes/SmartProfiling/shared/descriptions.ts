import type { INodeProperties } from 'n8n-workflow';

// Common video ID input field
export const videoIdField: INodeProperties = {
	displayName: 'Video ID or URL',
	name: 'videoId',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'dQw4w9WgXcQ or https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	description: 'YouTube video ID or full URL',
};

// Multiple video IDs input field
export const videoIdsField: INodeProperties = {
	displayName: 'Video IDs or URLs',
	name: 'videoIds',
	type: 'string',
	typeOptions: {
		rows: 4,
	},
	required: true,
	default: '',
	placeholder: 'dQw4w9WgXcQ\nhttps://www.youtube.com/watch?v=xyz123',
	description: 'YouTube video IDs or URLs, one per line',
};

// Format selection field
export const formatField: INodeProperties = {
	displayName: 'Format',
	name: 'format',
	type: 'options',
	options: [
		{
			name: 'JSON',
			value: 'json',
			description: 'Full transcript data with segments',
		},
		{
			name: 'Text',
			value: 'text',
			description: 'Plain text transcript',
		},
		{
			name: 'SRT',
			value: 'srt',
			description: 'SubRip subtitle format',
		},
		{
			name: 'VTT',
			value: 'vtt',
			description: 'WebVTT subtitle format',
		},
	],
	default: 'json',
	description: 'Output format for the transcript',
};

// Language selection field
export const languageField: INodeProperties = {
	displayName: 'Language',
	name: 'language',
	type: 'string',
	default: 'en',
	placeholder: 'en',
	description: 'Preferred transcript language code (e.g., en, es, fr)',
};

// Channel ID field
export const channelIdField: INodeProperties = {
	displayName: 'Channel ID or Handle',
	name: 'channelId',
	type: 'string',
	required: true,
	default: '',
	placeholder: '@MrBeast or UCX6OQ3DkcsbYNE6H8uQQuVA',
	description: 'YouTube channel ID or handle (starting with @)',
};

// Playlist ID field
export const playlistIdField: INodeProperties = {
	displayName: 'Playlist ID or URL',
	name: 'playlistId',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
	description: 'YouTube playlist ID or full playlist URL',
};

// Conversation ID field (for chat)
export const conversationIdField: INodeProperties = {
	displayName: 'Conversation ID',
	name: 'conversationId',
	type: 'string',
	default: '',
	description: 'Optional conversation ID for continuing a chat session. Leave empty for new conversation.',
};

// Message field (for chat)
export const messageField: INodeProperties = {
	displayName: 'Message',
	name: 'message',
	type: 'string',
	typeOptions: {
		rows: 3,
	},
	required: true,
	default: '',
	placeholder: 'What is this video about?',
	description: 'Your question or message about the video content',
};
