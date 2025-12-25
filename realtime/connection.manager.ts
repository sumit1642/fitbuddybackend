// realtime/connection.manager.ts
import type { Socket } from "socket.io";

const userSockets = new Map<string, Set<string>>();

export const ConnectionManager = {
	add(userId: string, socket: Socket) {
		if (!userSockets.has(userId)) {
			userSockets.set(userId, new Set());
		}
		userSockets.get(userId)!.add(socket.id);
	},

	remove(userId: string, socketId: string) {
		const set = userSockets.get(userId);
		if (!set) return;
		set.delete(socketId);
		if (set.size === 0) userSockets.delete(userId);
	},

	getSockets(userId: string): string[] {
		return Array.from(userSockets.get(userId) ?? []);
	},
};
