// tests/setup/helpers.ts
import request from "supertest";
import { getTestApp } from "./server.js";
import { dbPool } from "../../repositories/db.js";

/**
 * HTTP request helper with fake auth
 */
export function makeRequest(userId: string) {
	const app = getTestApp();
	return {
		post: (url: string) => request(app).post(url).set("x-user-id", userId),
		get: (url: string) => request(app).get(url).set("x-user-id", userId),
		put: (url: string) => request(app).put(url).set("x-user-id", userId),
		delete: (url: string) => request(app).delete(url).set("x-user-id", userId),
	};
}

/**
 * Database query helpers for test assertions
 */
export async function getInviteById(inviteId: string) {
	const { rows } = await dbPool.query("SELECT * FROM invites WHERE id = $1", [inviteId]);
	return rows[0] ?? null;
}

export async function getSessionById(sessionId: string) {
	const { rows } = await dbPool.query("SELECT * FROM run_sessions WHERE id = $1", [sessionId]);
	return rows[0] ?? null;
}

export async function getParticipantBySessionAndUser(sessionId: string, userId: string) {
	const { rows } = await dbPool.query("SELECT * FROM session_participants WHERE session_id = $1 AND user_id = $2", [
		sessionId,
		userId,
	]);
	return rows[0] ?? null;
}

export async function countParticipants(sessionId: string): Promise<number> {
	const { rows } = await dbPool.query("SELECT COUNT(*) as count FROM session_participants WHERE session_id = $1", [
		sessionId,
	]);
	return parseInt(rows[0]?.count ?? "0");
}

/**
 * Create a test session for a user
 */
export async function createTestSession(userId: string, type: "public" | "private" = "public") {
	const { rows } = await dbPool.query(
		`
		INSERT INTO run_sessions (owner_user_id, type)
		VALUES ($1, $2)
		RETURNING *
		`,
		[userId, type],
	);

	// Also add owner as participant
	await dbPool.query(
		`
		INSERT INTO session_participants (session_id, user_id, role)
		VALUES ($1, $2, 'owner')
		`,
		[rows[0].id, userId],
	);

	return rows[0];
}

/**
 * Create a test invite
 */
export async function createTestInvite(fromUserId: string, toUserId: string, sessionId: string) {
	const session = await getSessionById(sessionId);
	const { rows } = await dbPool.query(
		`
		INSERT INTO invites (from_user_id, to_user_id, session_id, session_type)
		VALUES ($1, $2, $3, $4)
		RETURNING *
		`,
		[fromUserId, toUserId, sessionId, session.type],
	);
	return rows[0];
}

/**
 * Create a test friend request
 */
export async function createTestFriendRequest(fromUserId: string, toUserId: string) {
	const { rows } = await dbPool.query(
		`
		INSERT INTO friend_requests (from_user_id, to_user_id)
		VALUES ($1, $2)
		RETURNING *
		`,
		[fromUserId, toUserId],
	);
	return rows[0];
}

/**
 * Get friend request by ID
 */
export async function getFriendRequestById(requestId: string) {
	const { rows } = await dbPool.query("SELECT * FROM friend_requests WHERE id = $1", [requestId]);
	return rows[0] ?? null;
}

/**
 * Check if two users are friends
 */
export async function areFriends(userA: string, userB: string): Promise<boolean> {
	const { rows } = await dbPool.query(
		`
		SELECT 1
		FROM friends
		WHERE user_id = $1 AND friend_user_id = $2
		LIMIT 1
		`,
		[userA, userB],
	);
	return rows.length > 0;
}
