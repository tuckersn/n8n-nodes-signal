import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';



export class SignalMessage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Signal',
		name: 'signalMessage',
		icon: 'file:signal.svg',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Sends a message over Signal',
		defaults: {
			name: 'Send Signal Message',
		},
		usableAsTool: true,
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'signalApi',
				required: true,
				testedBy: 'signalConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				noDataExpression: true,
				default: 'sendMessage',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
				options: [
					{
						name: 'Send a Message',
						value: 'sendMessage',
						action: 'Send a Message',
					},
				],
			},
			{
				displayName: 'Phone Number / Username',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: 'The phone number or username to send the message to',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'The message to be sent',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  
		const credentials = await this.getCredentials('signalCredentials');

		this.logger.info(`Sending message to ${this.getNodeParameter('phoneNumber', 0)}`);
		this.logger.info(`Message: ${this.getNodeParameter('message', 0)}`);
		this.logger.info(`JSON RPC URL: ${credentials.jsonRpcUrl}`);

		const phoneNumber = this.getNodeParameter('phoneNumber', 0);
		if (
			phoneNumber === undefined ||
			phoneNumber === null ||
			phoneNumber === "" || 
			phoneNumber === 0
		) {
			this.logger.error('Phone number is required');
			return [];
		}

		const messageRequest = await fetch(
			`${credentials.jsonRpcUrl}/api/v1/rpc`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				"jsonrpc": "2.0",
				"method": "send",
				"params": {
					"recipient": [this.getNodeParameter('phoneNumber', 0)],
					"message": this.getNodeParameter('message', 0)
				},
				"id": 1
			}),
		});

		const body = await messageRequest.text();
		this.logger.info(`Message request: ${body} ${messageRequest.status}`);
		
		if (body.trim() === "") {
			return [];
		} else {
			const data: any = JSON.parse(body);
			this.logger.info(`Message request: ${data}`);
			if ("result" in data) {
				return [
					[
						{
							json: data.result
						}
					]
				];
			}
			
			return [
				[
					{
						json: data
					}
				]
			]
		}
	}
}