// repositories/session.repository.ts

import { dbPool } from "./db.js";
import { Session } from "../domain/types.js";
import { SessionType, SessionEndReason } from "../domain/constants.js";

/**
 * Map a DB row to a Session domain type.
 */
function mapRowToSession(row: any): Session {
	return {
		id: row.id,
		owner_user_id: row.owner_user_id,
		type: row.type,

		started_at: row.started_at,
		ended_at: row.ended_at,
		ended_reason: row.ended_reason,
	};
}

export const SessionRepository = {
	/**
	 * Find the active session for a user.
	 */
	async findActiveByUser(userId: string): Promise<Session | null> {
		const result = await dbPool.query(
			`
      SELECT *
      FROM run_sessions
      WHERE owner_user_id = $1
        AND ended_at IS NULL
      LIMIT 1
      `,
			[userId],
		);

		if (result.rowCount === 0) {
			return null;
		}

		return mapRowToSession(result.rows[0]);
	},

	/**
	 * Find a session by id.
	 */
	async findById(sessionId: string): Promise<Session | null> {
		const result = await dbPool.query(
			`
      SELECT *
      FROM run_sessions
      WHERE id = $1
      `,
			[sessionId],
		);

		if (result.rowCount === 0) {
			return null;
		}

		return mapRowToSession(result.rows[0]);
	},

	/**
	 * Create a new session.
	 */
	async createSession(ownerUserId: string, type: SessionType): Promise<Session> {
		const result = await dbPool.query(
			`
      INSERT INTO run_sessions (owner_user_id, type)
      VALUES ($1, $2)
      RETURNING *
      `,
			[ownerUserId, type],
		);

		return mapRowToSession(result.rows[0]);
	},

	/**
	 * End a session with a reason.
	 */
	async endSession(sessionId: string, reason: SessionEndReason): Promise<void> {
		await dbPool.query(
			`
      UPDATE run_sessions
      SET ended_at = now(),
          ended_reason = $2
      WHERE id = $1
        AND ended_at IS NULL
      `,
			[sessionId, reason],
		);
	},
};
