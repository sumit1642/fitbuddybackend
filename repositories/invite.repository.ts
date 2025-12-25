// repositories/invite.repository.ts
import { dbPool } from "./db.js";
import type { PoolClient } from "pg";

export type InviteRow = {
	id: string;
	from_user_id: string;
	to_user_id: string;
	session_id: string;
	session_type: "public" | "private";
	created_at: string;
	accepted_at: string | null;
	declined_at: string | null;
	revoked_at: string | null;
};

export const InviteRepository = {
	async create(fromUserId: string, toUserId: string, sessionId: string, sessionType: string) {
		const { rows } = await dbPool.query<InviteRow>(
			`
			INSERT INTO invites (from_user_id, to_user_id, session_id, session_type)
			VALUES ($1, $2, $3, $4)
			RETURNING *
			`,
			[fromUserId, toUserId, sessionId, sessionType],
		);
		return rows[0];
	},

	async findById(inviteId: string) {
		const { rows } = await dbPool.query<InviteRow>(`SELECT * FROM invites WHERE id = $1`, [inviteId]);
		return rows[0] ?? null;
	},

	/**
	 * Mark invite as accepted ONLY if it's still pending.
	 * Returns true if accepted, false if already processed.
	 *
	 * Race-safe: Multiple concurrent calls will only succeed once.
	 * The WHERE clause ensures atomic state transition.
	 */
	async markAccepted(inviteId: string, client?: PoolClient): Promise<boolean> {
		const queryRunner = client ?? dbPool;

		const result = await queryRunner.query(
			`
			UPDATE invites 
			SET accepted_at = now() 
			WHERE id = $1
			  AND accepted_at IS NULL
			  AND declined_at IS NULL
			  AND revoked_at IS NULL
			RETURNING id
			`,
			[inviteId],
		);

		return result.rowCount === 1;
	},

	/**
	 * Mark invite as declined ONLY if it's still pending.
	 * Returns true if declined, false if already processed.
	 */
	async markDeclined(inviteId: string): Promise<boolean> {
		const result = await dbPool.query(
			`
			UPDATE invites 
			SET declined_at = now() 
			WHERE id = $1
			  AND accepted_at IS NULL
			  AND declined_at IS NULL
			  AND revoked_at IS NULL
			RETURNING id
			`,
			[inviteId],
		);

		return result.rowCount === 1;
	},

	/**
	 * Mark invite as revoked ONLY if it's still pending.
	 * Returns true if revoked, false if already processed.
	 */
	async markRevoked(inviteId: string): Promise<boolean> {
		const result = await dbPool.query(
			`
			UPDATE invites 
			SET revoked_at = now() 
			WHERE id = $1
			  AND accepted_at IS NULL
			  AND declined_at IS NULL
			  AND revoked_at IS NULL
			RETURNING id
			`,
			[inviteId],
		);

		return result.rowCount === 1;
	},

	async listPendingForUser(userId: string) {
		const { rows } = await dbPool.query<InviteRow>(
			`
			SELECT *
			FROM invites
			WHERE to_user_id = $1
			  AND accepted_at IS NULL
			  AND declined_at IS NULL
			  AND revoked_at IS NULL
			ORDER BY created_at DESC
			`,
			[userId],
		);
		return rows;
	},
};
