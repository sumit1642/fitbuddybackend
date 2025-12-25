// services/presence.service.ts
import { redis } from "../infrastructure/redis/client.js";
import { RedisKeys } from "../infrastructure/redis/keys.js";
import { getSocketServer } from "../realtime/socket.server.js";
import { RealtimeEvents } from "../realtime/events.js";

const PRESENCE_TTL_SECONDS = 30;

type PresencePayload = {
	session_id: string;
	last_seen: string;
};

export const PresenceService = {
	/**
	 * Update (or create) presence for a user.
	 * Called repeatedly as a heartbeat.
	 */
	async heartbeat(userId: string, sessionId: string): Promise<void> {
		const payload: PresencePayload = {
			session_id: sessionId,
			last_seen: new Date().toISOString(),
		};

		// Check if user was offline before this heartbeat
		const wasOffline = !(await redis.exists(RedisKeys.presence(userId)));

		await redis.set(RedisKeys.presence(userId), JSON.stringify(payload), {
			EX: PRESENCE_TTL_SECONDS,
		});

		// Emit user_online only on transition from offline to online
		if (wasOffline) {
			const io = getSocketServer();
			io.emit(RealtimeEvents.USER_ONLINE, {
				user_id: userId,
				session_id: sessionId,
				timestamp: payload.last_seen,
			});
		}
	},

	/**
	 * Get current presence for a user.
	 * Returns null if user is offline / expired.
	 */
	async getPresence(userId: string): Promise<PresencePayload | null> {
		const value = await redis.get(RedisKeys.presence(userId));

		if (!value) {
			return null;
		}

		return JSON.parse(value) as PresencePayload;
	},

	/**
	 * Explicitly clear presence.
	 * Used when a session is stopped or explicitly ended.
	 *
	 * KNOWN LIMITATION:
	 * If Redis TTL expires naturally (no heartbeats for ~30s),
	 * USER_OFFLINE is NOT emitted automatically.
	 *
	 * This only affects crash / silent-disconnect scenarios
	 * where clearPresence() is never called.
	 *
	 * Explicit session stops and controlled disconnects
	 * emit USER_OFFLINE correctly.
	 *
	 * Future improvement:
	 * - Use Redis keyspace notifications (__keyevent@__:expired)
	 *   to emit USER_OFFLINE on TTL expiry.
	 * - Revisit when realtime accuracy becomes critical.
	 */

	async clearPresence(userId: string): Promise<void> {
		const existed = await redis.del(RedisKeys.presence(userId));

		// Emit user_offline only if presence actually existed
		if (existed) {
			const io = getSocketServer();
			io.emit(RealtimeEvents.USER_OFFLINE, {
				user_id: userId,
				timestamp: new Date().toISOString(),
			});
		}
	},
};
