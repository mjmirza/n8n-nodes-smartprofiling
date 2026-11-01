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
				'Enter only the domain, for example https://smartprofiling.com. The /api/v1 path is added automatically. Must use https and a public host, local and private addresses are rejected.',
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
			// Reads cached channel videos, which checks the key without deducting credits.
			url: '/api/v1/channels/UCBR8-60-B28hp2BmDPdntcQ/videos',
			method: 'GET',
			qs: {
				limit: 1,
			},
		},
	};
}
