// tests/friends/list.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase } from "../setup/db.js";
import { createTestUsers, TEST_USERS } from "../setup/users.js";
import { makeRequest, createTestFriendRequest } from "../setup/helpers.js";

describe("Friend Lists", () => {
	beforeEach(async () => {
		await cleanDatabase();
		await createTestUsers();
	});

	it("List friends (empty)", async () => {
		// Action: List friends
		const res = await makeRequest(TEST_USERS.OWNER.id).get("/api/friends");

		// Assertions
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("List friends after accepting request", async () => {
		// Setup: Create and accept friend request
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`);

		// Action: List friends for both users
		const ownerRes = await makeRequest(TEST_USERS.OWNER.id).get("/api/friends");
		const inviteeRes = await makeRequest(TEST_USERS.INVITEE.id).get("/api/friends");

		// Assertions: OWNER sees INVITEE
		expect(ownerRes.status).toBe(200);
		expect(ownerRes.body).toHaveLength(1);
		expect(ownerRes.body[0].friend_user_id).toBe(TEST_USERS.INVITEE.id);

		// Assertions: INVITEE sees OWNER
		expect(inviteeRes.status).toBe(200);
		expect(inviteeRes.body).toHaveLength(1);
		expect(inviteeRes.body[0].friend_user_id).toBe(TEST_USERS.OWNER.id);
	});

	it("List pending requests (empty)", async () => {
		// Action: List pending requests
		const res = await makeRequest(TEST_USERS.INVITEE.id).get("/api/friends/requests/pending");

		// Assertions
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("List pending requests", async () => {
		// Setup: Send friend request
		await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);

		// Action: List pending for INVITEE
		const res = await makeRequest(TEST_USERS.INVITEE.id).get("/api/friends/requests/pending");

		// Assertions
		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(1);
		expect(res.body[0].from_user_id).toBe(TEST_USERS.OWNER.id);
		expect(res.body[0].to_user_id).toBe(TEST_USERS.INVITEE.id);
		expect(res.body[0].accepted_at).toBeNull();
		expect(res.body[0].declined_at).toBeNull();
	});

	it("Pending requests do not include accepted/declined", async () => {
		// Setup: Send and accept one, send and decline another
		const request1 = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request1.id}/accept`);

		const request2 = await createTestFriendRequest(TEST_USERS.STRANGER.id, TEST_USERS.INVITEE.id);
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request2.id}/decline`);

		// Action: List pending
		const res = await makeRequest(TEST_USERS.INVITEE.id).get("/api/friends/requests/pending");

		// Assertions: Empty list (all processed)
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it("Check friendship status (true)", async () => {
		// Setup: Create friendship
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`);

		// Action: Check friendship
		const res = await makeRequest(TEST_USERS.OWNER.id).get(`/api/friends/${TEST_USERS.INVITEE.id}`);

		// Assertions
		expect(res.status).toBe(200);
		expect(res.body.areFriends).toBe(true);
	});

	it("Check friendship status (false)", async () => {
		// Action: Check non-existent friendship
		const res = await makeRequest(TEST_USERS.OWNER.id).get(`/api/friends/${TEST_USERS.STRANGER.id}`);

		// Assertions
		expect(res.status).toBe(200);
		expect(res.body.areFriends).toBe(false);
	});
});
