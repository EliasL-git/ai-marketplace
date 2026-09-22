const WebSocket = require('ws');

class StreamingService {
    constructor() {
        this.clients = new Map(); // userId -> Set of connections
    }

    registerClient(userId, ws) {
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(ws);

        ws.on('close', () => {
            const clients = this.clients.get(userId);
            if (clients) {
                clients.delete(ws);
                if (clients.size === 0) {
                    this.clients.delete(userId);
                }
            }
        });

        return ws;
    }

    streamToClient(userId, data) {
        const clients = this.clients.get(userId);
        if (clients) {
            clients.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(data));
                }
            });
        }
    }

    broadcastToAll(data) {
        this.clients.forEach(clients => {
            clients.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(data));
                }
            });
        });
    }
}

module.exports = new StreamingService();