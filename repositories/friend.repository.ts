// repositories/friend.repository.ts
import { dbPool } from "./db.js";
import type { PoolClient } from "pg";

export type FriendRequestRow = {
	id: string;
	from_user_id: string;
	to_user_id: string;
	created_at: string;
	accepted_at: string | null;
	declined_at: string | null;
};

export const FriendRepository = {
	/**
	 * Check if two users are friends.
	 * Fast indexed lookup.
	 */
	async areFriends(userA: string, userB: string): Promise<boolean> {
		const { rows } = await dbPool.query(
			`
			SELECT 1
			FROM friends
			WHERE user_id = $1
			  AND friend_user_id = $2
			LIMIT 1
			`,
			[userA, userB],
		);
		return rows.length > 0;
	},

	/**
	 * Create friendship rows (bidirectional).
	 * Called during friend request acceptance.
	 * Optionally accepts a client for transaction support.
	 */
	async createFriendship(userA: string, userB: string, client?: PoolClient): Promise<void> {
		const queryRunner = client ?? dbPool;

		// Insert both directions
		await queryRunner.query(
			`
			INSERT INTO friends (user_id, friend_user_id)
			VALUES ($1, $2), ($2, $1)
			ON CONFLICT (user_id, friend_user_id) DO NOTHING
			`,
			[userA, userB],
		);
	},
};

export const FriendRequestRepository = {
	/**
	 * Create a friend request.
	 * DB constraint prevents duplicate pending requests.
	 */
	async create(fromUserId: string, toUserId: string): Promise<FriendRequestRow> {
		const { rows } = await dbPool.query<FriendRequestRow>(
			`
			INSERT INTO friend_requests (from_user_id, to_user_id)
			VALUES ($1, $2)
			RETURNING *
			`,
			[fromUserId, toUserId],
		);
		return rows[0]!;
	},

	/**
	 * Find a friend request by ID.
	 */
	async findById(requestId: string) {
		const { rows } = await dbPool.query<FriendRequestRow>(`SELECT * FROM friend_requests WHERE id = $1`, [
			requestId,
		]);
		return rows[0] ?? null;
	},

	/**
	 * Mark friend request as accepted ONLY if it's still pending.
	 * Returns true if accepted, false if already processed.
	 *
	 * Race-safe: Multiple concurrent calls will only succeed once.
	 * The WHERE clause ensures atomic state transition.
	 */
	async markAccepted(requestId: string, client?: PoolClient): Promise<boolean> {
		const queryRunner = client ?? dbPool;

		const result = await queryRunner.query(
			`
			UPDATE friend_requests 
			SET accepted_at = now() 
			WHERE id = $1
			  AND accepted_at IS NULL
			  AND declined_at IS NULL
			RETURNING id
			`,
			[requestId],
		);

		return result.rowCount === 1;
	},

	/**
	 * Mark friend request as declined ONLY if it's still pending.
	 * Returns true if declined, false if already processed.
	 */
	async markDeclined(requestId: string): Promise<boolean> {
		const result = await dbPool.query(
			`
			UPDATE friend_requests 
			SET declined_at = now() 
			WHERE id = $1
			  AND accepted_at IS NULL
			  AND declined_at IS NULL
			RETURNING id
			`,
			[requestId],
		);

		return result.rowCount === 1;
	},

	/**
	 * List pending friend requests for a user.
	 */
	async listPendingForUser(userId: string) {
		const { rows } = await dbPool.query<FriendRequestRow>(
			`
			SELECT *
			FROM friend_requests
			WHERE to_user_id = $1
			  AND accepted_at IS NULL
			  AND declined_at IS NULL
			ORDER BY created_at DESC
			`,
			[userId],
		);
		return rows;
	},
};
