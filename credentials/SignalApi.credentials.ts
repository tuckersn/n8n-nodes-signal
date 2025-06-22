import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SignalApi implements ICredentialType {
	name = 'signalApi';
	displayName = 'Signal API';

	documentationUrl = 'https://your-docs-url';

	properties: INodeProperties[] = [
		{
			displayName: 'JSON RPC URL',
			name: 'jsonRpcUrl',
			type: 'string',
			default: 'http://localhost:8080',
		},
	];

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://example.com/',
			url: '',
		},
	};
}
