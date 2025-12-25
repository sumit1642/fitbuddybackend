import { redis } from "../infrastructure/redis/client.js";
import { RedisKeys } from "../infrastructure/redis/keys.js";

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

		await redis.set(RedisKeys.presence(userId), JSON.stringify(payload), {
			EX: PRESENCE_TTL_SECONDS,
		});
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
	 * Used when a session is stopped.
	 */
	async clearPresence(userId: string): Promise<void> {
		await redis.del(RedisKeys.presence(userId));
	},
};
