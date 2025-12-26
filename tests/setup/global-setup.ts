// tests/setup/global-setup.ts
import { beforeAll, afterAll } from "vitest";
import { startTestServer, stopTestServer } from "./server.js";
import { closeDatabase } from "./db.js";
import { redis } from "../../infrastructure/redis/client.js";

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
	// Start test server
	await startTestServer();
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
	// Stop server
	await stopTestServer();

	// Close database connection
	await closeDatabase();

	// Close Redis connection
	if (redis.isOpen) {
		await redis.quit();
	}
});
