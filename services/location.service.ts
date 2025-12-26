// services/location.service.ts
import { redis } from "../infrastructure/redis/client.js"
import { RedisKeys } from "../infrastructure/redis/keys.js";

const LOCATION_TTL_SECONDS = 10;

type LocationPayload = {
	lat: number;
	lng: number;
	accuracy: number;
	updated_at: string;
};

export const LocationService = {
	/**
	 * Update the user's live location.
	 * Overwrites previous location and refreshes TTL.
	 */
	async updateLocation(userId: string, lat: number, lng: number, accuracy: number): Promise<void> {
		const payload: LocationPayload = {
			lat,
			lng,
			accuracy,
			updated_at: new Date().toISOString(),
		};

		await redis.set(RedisKeys.location(userId), JSON.stringify(payload), {
			EX: LOCATION_TTL_SECONDS,
		});
	},

	/**
	 * Get the user's current live location.
	 * Returns null if expired or missing.
	 */
	async getLocation(userId: string): Promise<LocationPayload | null> {
		const value = await redis.get(RedisKeys.location(userId));

		if (!value) {
			return null;
		}

		return JSON.parse(value) as LocationPayload;
	},

	/**
	 * Explicitly clear a user's live location.
	 * Used when a session ends.
	 */
	async clearLocation(userId: string): Promise<void> {
		await redis.del(RedisKeys.location(userId));
	},
};
