import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	NodeConnectionType,
} from 'n8n-workflow';

import * as http from 'http';

export class SignalTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Signal Trigger',
		name: 'signalTrigger',
		icon: 'file:signal.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens to Signal messages via Server-Sent Events',
		eventTriggerDescription: '',
		defaults: {
			name: 'Signal Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>While building your workflow</b>, click the 'execute step' button, then send a Signal message. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, <a data-key='activate'>activate</a> it. Then every time a Signal message is received, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'execute step' button, then send a Signal message. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time a Signal message is received, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				"Once you've finished building your workflow, <a data-key='activate'>activate</a> it to have it also listen continuously (you just won't see those executions here).",
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'signal',
				required: false,
			},
		],
		properties: [

		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		this.logger.info('Signal trigger starting with SSE connection');

		let sseRequest: http.ClientRequest | null = null;

		//@ts-ignore
		let isConnected = false;

		const connectSSE = () => {
			if (sseRequest) {
				sseRequest.destroy();
			}

			const options = {
				hostname: 'localhost',
				port: 8080,
				path: '/api/v1/events',
				method: 'GET',
				headers: {
					'Accept': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
				},
			};

			sseRequest = http.request(options, (response) => {
				this.logger.info(`SSE connection established, status: ${response.statusCode}`);
				isConnected = true;

				let buffer = '';

				response.on('data', (chunk) => {
					buffer += chunk.toString();
					
					// Process complete SSE messages
					const lines = buffer.split('\n');
					buffer = lines.pop() || ''; // Keep incomplete line in buffer

					let eventType = '';
					let eventData = '';

					for (const line of lines) {
						if (line.startsWith('event:')) {
							eventType = line.substring(6).trim();
						} else if (line.startsWith('data:')) {
							eventData = line.substring(5).trim();
						} else if (line === '' && eventType && eventData) {
							// Complete event received
							try {
								if (eventType === 'receive') {
									const parsedData = JSON.parse(eventData);
									this.logger.info(`Active mode received Signal message: ${JSON.stringify(parsedData)}`);
									
									this.emit([this.helpers.returnJsonArray([parsedData])]);
								}
							} catch (error) {
								this.logger.error(`Error parsing SSE data: ${error}`);
							}
							
							// Reset for next event
							eventType = '';
							eventData = '';
						}
					}
				});

				response.on('end', () => {
					this.logger.info('SSE connection ended');
					isConnected = false;
					// Attempt to reconnect after a delay
					setTimeout(connectSSE, 5000);
				});

				response.on('error', (error) => {
					this.logger.error(`SSE response error: ${error}`);
					isConnected = false;
					setTimeout(connectSSE, 5000);
				});
			});

			sseRequest.on('error', (error) => {
				this.logger.error(`SSE request error: ${error}`);
				isConnected = false;
				setTimeout(connectSSE, 5000);
			});

			sseRequest.end();
		};

		const closeFunction = async () => {
			this.logger.info('Closing SSE connection');
			if (sseRequest) {
				sseRequest.destroy();
				sseRequest = null;
			}
			isConnected = false;
		};

		if (this.getMode() === 'manual') {
			// For manual mode, create a temporary SSE connection to get the first available event
			const manualTriggerFunction = async () => {
				return new Promise<void>((resolve) => {
					const options = {
						hostname: 'localhost',
						port: 8080,
						path: '/api/v1/events',
						method: 'GET',
						headers: {
							'Accept': 'text/event-stream',
							'Cache-Control': 'no-cache',
							'Connection': 'keep-alive',
						},
					};

					const manualRequest = http.request(options, (response) => {
						this.logger.info('Manual SSE connection established');
						let buffer = '';
						let eventReceived = false;

						const timeout = setTimeout(() => {
							if (!eventReceived) {
								this.logger.info('Manual trigger timeout - no events received');
								manualRequest.destroy();
								resolve();
							}
						}, 10000); // 10 second timeout

						response.on('data', (chunk) => {
							if (eventReceived) return;
							
							buffer += chunk.toString();
							const lines = buffer.split('\n');
							buffer = lines.pop() || '';

							let eventType = '';
							let eventData = '';

							for (const line of lines) {
								if (line.startsWith('event:')) {
									eventType = line.substring(6).trim();
								} else if (line.startsWith('data:')) {
									eventData = line.substring(5).trim();
								} else if (line === '' && eventType && eventData) {
									if (eventType === 'receive') {
										try {
											const parsedData = JSON.parse(eventData);
											this.logger.info(`Manual trigger received: ${JSON.stringify(parsedData)}`);
											this.emit([this.helpers.returnJsonArray([parsedData])]);
											eventReceived = true;
											clearTimeout(timeout);
											manualRequest.destroy();
											resolve();
										} catch (error) {
											this.logger.error(`Manual trigger parse error: ${error}`);
										}
									}
									eventType = '';
									eventData = '';
								}
							}
						});

						response.on('end', () => {
							clearTimeout(timeout);
							resolve();
						});

						response.on('error', (error) => {
							this.logger.error(`Manual SSE error: ${error}`);
							clearTimeout(timeout);
							resolve();
						});
					});

					manualRequest.on('error', (error) => {
						this.logger.error(`Manual request error: ${error}`);
						resolve();
					});

					manualRequest.end();
				});
			};

			return {
				closeFunction,
				manualTriggerFunction,
			};
		}

		// Start SSE connection for continuous listening
		connectSSE();

		return {
			closeFunction,
		};
	}
}
