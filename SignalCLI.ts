

export function transformEnevelopeToFlatObject(envelope: any): any {
    return {
        id: envelope.id,
        timestamp: envelope.timestamp,
        sender: envelope.sender,
        recipient: envelope.recipient,
        message: envelope.message,
    };
}