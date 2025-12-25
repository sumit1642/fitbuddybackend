// realtime/handlers/location.handler.ts
import { Socket } from "socket.io"
import { LocationService } from "../../services/location.service.js";
import { getSocketServer } from "../socket.server.js";
import { RealtimeEvents } from "../events.js";

/**
 * Last-write-wins throttle state (per user).
 * Ephemeral, disposable.
 */
type Pending = {
	lat: number;
	lng: number;
	accuracy: number;
	timestamp: string;
	sessionId: string;
};

const pendingByUser = new Map<string, Pending>();
const timerByUser = new Map<string, NodeJS.Timeout>();

const THROTTLE_MS = 1000;

type AuthedSocket = Socket & {
	userId?: string;
	sessionId?: string; // set when user joins a session room
};

export function registerLocationHandler(socket: AuthedSocket) {
	socket.on("location_update", async (payload: { lat: number; lng: number; accuracy: number }) => {
		const userId = socket.userId;
		const sessionId = socket.sessionId;

		if (!userId || !sessionId) {
			// Not in a session room → ignore
			return;
		}

		// 1) Accept update into Redis (truth for "now")
		await LocationService.updateLocation(userId, payload.lat, payload.lng, payload.accuracy);

		// 2) Overwrite pending (last-write-wins)
		pendingByUser.set(userId, {
			lat: payload.lat,
			lng: payload.lng,
			accuracy: payload.accuracy,
			timestamp: new Date().toISOString(),
			sessionId,
		});

		// 3) If a timer is already running, do nothing
		if (timerByUser.has(userId)) return;

		// 4) Schedule a single emit at the end of the window
		const timer = setTimeout(() => {
			const pending = pendingByUser.get(userId);
			if (!pending) return;

			const io = getSocketServer();

			// Fan-out ONLY to the session room
			io.to(`session:${pending.sessionId}`).emit(RealtimeEvents.LOCATION_UPDATE, {
				user_id: userId,
				lat: pending.lat,
				lng: pending.lng,
				accuracy: pending.accuracy,
				timestamp: pending.timestamp,
			});

			pendingByUser.delete(userId);
			timerByUser.delete(userId);
		}, THROTTLE_MS);

		timerByUser.set(userId, timer);
	});
}
