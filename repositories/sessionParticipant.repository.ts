// repositories/sessionParticipant.repository.ts

import { dbPool } from "./db.js";
import { SessionParticipant } from "../domain/types.js";
import type { PoolClient } from "pg";

/**
 * Map a DB row to a SessionParticipant domain type.
 */
function mapRowToSessionParticipant(row: any): SessionParticipant {
	return {
		session_id: row.session_id,
		user_id: row.user_id,
		role: row.role,

		joined_at: row.joined_at,
		left_at: row.left_at,
	};
}

export const SessionParticipantRepository = {
	/**
	 * Add a participant to a session.
	 * DB composite PK prevents duplicates.
	 * Optionally accepts a client for transaction support.
	 */
	async addParticipant(
		sessionId: string,
		userId: string,
		role: "owner" | "invited",
		client?: PoolClient,
	): Promise<SessionParticipant> {
		const queryRunner = client ?? dbPool;

		const result = await queryRunner.query(
			`
			INSERT INTO session_participants (session_id, user_id, role)
			VALUES ($1, $2, $3)
			ON CONFLICT (session_id, user_id) DO NOTHING
			RETURNING *
			`,
			[sessionId, userId, role],
		);

		// If ON CONFLICT triggered, fetch the existing participant
		if (result.rowCount === 0) {
			const existing = await queryRunner.query(
				`
				SELECT *
				FROM session_participants
				WHERE session_id = $1 AND user_id = $2
				`,
				[sessionId, userId],
			);
			return mapRowToSessionParticipant(existing.rows[0]);
		}

		return mapRowToSessionParticipant(result.rows[0]);
	},

	/**
	 * Mark a participant as having left a session.
	 * Idempotent: calling twice has no effect.
	 */
	async markLeft(sessionId: string, userId: string): Promise<void> {
		await dbPool.query(
			`
			UPDATE session_participants
			SET left_at = now()
			WHERE session_id = $1
				AND user_id = $2
				AND left_at IS NULL
			`,
			[sessionId, userId],
		);
	},

	/**
	 * Get all active participants in a session.
	 * (Useful later for realtime fan-out.)
	 */
	async findActiveBySession(sessionId: string): Promise<SessionParticipant[]> {
		const result = await dbPool.query(
			`
			SELECT *
			FROM session_participants
			WHERE session_id = $1
				AND left_at IS NULL
			`,
			[sessionId],
		);

		return result.rows.map(mapRowToSessionParticipant);
	},
};
