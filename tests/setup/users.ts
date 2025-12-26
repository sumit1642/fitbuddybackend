// tests/setup/users.ts
import { dbPool } from "../../repositories/db.js";

/**
 * Fixed test user IDs (deterministic UUIDs for testing)
 */
export const TEST_USERS = {
	OWNER: {
		id: "00000000-0000-0000-0000-000000000001",
		email: "owner@test.com",
		display_name: "Session Owner",
	},
	INVITEE: {
		id: "00000000-0000-0000-0000-000000000002",
		email: "invitee@test.com",
		display_name: "Invitee User",
	},
	STRANGER: {
		id: "00000000-0000-0000-0000-000000000003",
		email: "stranger@test.com",
		display_name: "Stranger User",
	},
} as const;

/**
 * Create all test users with their settings.
 * Called at the start of each test file.
 */
export async function createTestUsers() {
	// Insert users
	await dbPool.query(
		`
		INSERT INTO users (id, email, display_name, status)
		VALUES 
			($1, $2, $3, 'active'),
			($4, $5, $6, 'active'),
			($7, $8, $9, 'active')
		`,
		[
			TEST_USERS.OWNER.id,
			TEST_USERS.OWNER.email,
			TEST_USERS.OWNER.display_name,
			TEST_USERS.INVITEE.id,
			TEST_USERS.INVITEE.email,
			TEST_USERS.INVITEE.display_name,
			TEST_USERS.STRANGER.id,
			TEST_USERS.STRANGER.email,
			TEST_USERS.STRANGER.display_name,
		],
	);

	// Insert user settings
	// INVITEE: accepts invites from anyone
	// STRANGER: accepts no invites
	await dbPool.query(
		`
		INSERT INTO user_settings (user_id, invite_permissions)
		VALUES 
			($1, 'anyone'),
			($2, 'anyone'),
			($3, 'none')
		`,
		[TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, TEST_USERS.STRANGER.id],
	);
}
