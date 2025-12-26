// tests/setup/db.ts
import { dbPool } from "../../repositories/db.js";
import { redis } from "../../infrastructure/redis/client.js";

/**
 * Truncate all test tables to ensure clean state.
 * Called before each test.
 */
export async function cleanDatabase() {
	await dbPool.query(`
		TRUNCATE TABLE 
			session_participants,
			invites,
			run_sessions,
			user_settings,
			users
		CASCADE
	`);

	// Clean Redis as well
	await redis.flushDb();
}

/**
 * Close database connection pool.
 * Called after all tests complete.
 */
export async function closeDatabase() {
	await dbPool.end();
}
