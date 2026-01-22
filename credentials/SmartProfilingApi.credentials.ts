import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SmartProfilingApi implements ICredentialType {
	name = 'smartProfilingApi';

	displayName = 'Smart Profiling API';

	icon = 'file:smartprofiling.svg' as const;

	documentationUrl = 'https://smartprofiling.com/api-docs';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'sp_xxxxxxxxxxxxxxxx',
			description: 'Your API key (starts with sp_). Get one at https://smartprofiling.com/dashboard',
		},
		{
			displayName: 'Base URL (Domain Only)',
			name: 'baseUrl',
			type: 'string',
			default: 'https://smartprofiling.com',
			placeholder: 'https://smartprofiling.com',
			hint: 'Enter only the domain. The /api/v1 path is added automatically.',
			description:
				'⚠️ IMPORTANT: Enter ONLY the domain (https://smartprofiling.com). Do NOT add /api/v1 - it will be added automatically and cause errors if included.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/transcripts',
			method: 'GET',
			qs: {
				id: 'dQw4w9WgXcQ',
			},
		},
	};
}
