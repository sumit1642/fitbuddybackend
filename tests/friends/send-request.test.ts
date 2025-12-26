// tests/friends/send-request.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase } from "../setup/db.js";
import { createTestUsers, TEST_USERS } from "../setup/users.js";
import { makeRequest, getFriendRequestById } from "../setup/helpers.js";

describe("Friend Request Send", () => {
	beforeEach(async () => {
		await cleanDatabase();
		await createTestUsers();
	});

	it("Send friend request (happy path)", async () => {
		// Action: Send friend request
		const res = await makeRequest(TEST_USERS.OWNER.id).post("/api/friends/requests").send({
			toUserId: TEST_USERS.INVITEE.id,
		});

		// Assertions: HTTP
		expect(res.status).toBe(201);
		expect(res.body).toHaveProperty("id");

		// Assertions: DB - Request row exists
		const request = await getFriendRequestById(res.body.id);
		expect(request).toBeTruthy();
		expect(request.from_user_id).toBe(TEST_USERS.OWNER.id);
		expect(request.to_user_id).toBe(TEST_USERS.INVITEE.id);

		// Assertions: DB - State is pending
		expect(request.accepted_at).toBeNull();
		expect(request.declined_at).toBeNull();
	});

	it("Cannot send friend request to self", async () => {
		// Action: Try to friend self
		const res = await makeRequest(TEST_USERS.OWNER.id).post("/api/friends/requests").send({
			toUserId: TEST_USERS.OWNER.id,
		});

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/cannot send friend request to self/i);
	});

	it("Cannot send friend request if already friends", async () => {
		// Setup: Create existing friendship
		const { dbPool } = await import("../../repositories/db.js");
		await dbPool.query(
			`
			INSERT INTO friends (user_id, friend_user_id)
			VALUES ($1, $2), ($2, $1)
			`,
			[TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id],
		);

		// Action: Try to send request
		const res = await makeRequest(TEST_USERS.OWNER.id).post("/api/friends/requests").send({
			toUserId: TEST_USERS.INVITEE.id,
		});

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/already friends/i);
	});

	it("Cannot send duplicate pending request (DB enforced)", async () => {
		// Setup: Send first request
		const res1 = await makeRequest(TEST_USERS.OWNER.id).post("/api/friends/requests").send({
			toUserId: TEST_USERS.INVITEE.id,
		});
		expect(res1.status).toBe(201);

		// Action: Try to send duplicate
		const res2 = await makeRequest(TEST_USERS.OWNER.id).post("/api/friends/requests").send({
			toUserId: TEST_USERS.INVITEE.id,
		});

		// Assertions: Error (DB unique constraint violation)
		expect(res2.status).toBeGreaterThanOrEqual(400);
	});
});
