// realtime/socket.server.ts
import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { ConnectionManager } from "./connection.manager.js";
import { RealtimeEvents } from "./events.js";
import { registerLocationHandler } from "./handlers/location.handler.js";
import { AuthedSocket } from "./types.js";
import { SessionRepository } from "../repositories/session.repository.js";

let ioInstance: Server | null = null;

export function initSocketServer(httpServer: HttpServer) {
	const io = new Server(httpServer, {
		cors: {
			origin: "*", // dev only
		},
	});

	ioInstance = io;

	io.on("connection", (rawSocket) => {
		const socket = rawSocket as AuthedSocket;

		// Fake auth for local dev (match fakeAuth middleware)
		const userId = (socket.handshake.auth?.userId as string) ?? "00000000-0000-0000-0000-000000000000";

		socket.userId = userId;
		socket.sessionId = undefined; // session context set on session start or auto-resume

		ConnectionManager.add(userId, socket);

		// Attempt auto-resume BEFORE registering handlers to ensure sessionId is set
		(async () => {
			try {
				const activeSession = await SessionRepository.findActiveByUser(userId);

				if (activeSession) {
					// attach context
					socket.sessionId = activeSession.id;

					// join room
					socket.join(`session:${activeSession.id}`);

					// notify client explicitly
					socket.emit(RealtimeEvents.SESSION_RESUMED, {
						session_id: activeSession.id,
						role: "owner", // owner for now; participants later
						timestamp: new Date().toISOString(),
					});
				}

				// Register handlers AFTER auto-resume so sessionId is already set
				registerLocationHandler(socket);

				socket.emit(RealtimeEvents.CONNECTED, {
					socketId: socket.id,
					userId,
				});
			} catch (error) {
				console.error(`❌ Error during socket connection setup for user ${userId}:`, error);

				// Still register handlers and emit connected even if auto-resume fails
				registerLocationHandler(socket);

				socket.emit(RealtimeEvents.CONNECTED, {
					socketId: socket.id,
					userId,
				});
			}
		})();

		socket.on("disconnect", () => {
			ConnectionManager.remove(userId, socket.id);
			socket.emit(RealtimeEvents.DISCONNECTED, {
				socketId: socket.id,
				userId,
			});
		});
	});

	console.log("🔌 Socket.IO ready");
	return io;
}

export function getSocketServer(): Server {
	if (!ioInstance) {
		throw new Error("Socket.IO not initialized");
	}
	return ioInstance;
}
