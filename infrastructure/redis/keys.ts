// infrastructure/redis/keys.ts

export const RedisKeys = {
	presence: (userId: string) => `presence:${userId}`,
	location: (userId: string) => `location:${userId}`,
};
