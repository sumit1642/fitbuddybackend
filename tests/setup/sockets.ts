// tests/setup/sockets.ts
import { io as ioClient, Socket } from "socket.io-client";

/**
 * Create a socket connection for a test user.
 */
export function createTestSocket(userId: string, port: number = 3001): Socket {
	return ioClient(`http://localhost:${port}`, {
		auth: { userId },
		transports: ["websocket"],
		reconnection: false,
	});
}

/**
 * Wait for a socket to connect.
 */
export function waitForConnection(socket: Socket): Promise<void> {
	return new Promise((resolve, reject) => {
		if (socket.connected) {
			resolve();
			return;
		}

		const timeout = setTimeout(() => {
			reject(new Error("Socket connection timeout"));
		}, 5000);

		socket.once("connect", () => {
			clearTimeout(timeout);
			resolve();
		});

		socket.once("connect_error", (err) => {
			clearTimeout(timeout);
			reject(err);
		});
	});
}

/**
 * Wait for a specific socket event.
 */
export function waitForEvent<T = any>(socket: Socket, eventName: string, timeout: number = 5000): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timeout waiting for event: ${eventName}`));
		}, timeout);

		socket.once(eventName, (data: T) => {
			clearTimeout(timer);
			resolve(data);
		});
	});
}

/**
 * Disconnect and cleanup a socket.
 */
export function disconnectSocket(socket: Socket): Promise<void> {
	return new Promise((resolve) => {
		if (!socket.connected) {
			resolve();
			return;
		}

		socket.once("disconnect", () => {
			resolve();
		});

		socket.disconnect();
	});
}
