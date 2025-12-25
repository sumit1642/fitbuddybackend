import { pool } from "./db.js";

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
		const { rows } = await pool.query<InviteRow>(
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
		const { rows } = await pool.query<InviteRow>(`SELECT * FROM invites WHERE id = $1`, [inviteId]);
		return rows[0] ?? null;
	},

	async markAccepted(inviteId: string) {
		await pool.query(`UPDATE invites SET accepted_at = now() WHERE id = $1`, [inviteId]);
	},

	async markDeclined(inviteId: string) {
		await pool.query(`UPDATE invites SET declined_at = now() WHERE id = $1`, [inviteId]);
	},

	async markRevoked(inviteId: string) {
		await pool.query(`UPDATE invites SET revoked_at = now() WHERE id = $1`, [inviteId]);
	},

	async listPendingForUser(userId: string) {
		const { rows } = await pool.query<InviteRow>(
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
