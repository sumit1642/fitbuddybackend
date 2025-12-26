// tests/friends/decline-request.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase } from "../setup/db.js";
import { createTestUsers, TEST_USERS } from "../setup/users.js";
import { makeRequest, createTestFriendRequest, getFriendRequestById, areFriends } from "../setup/helpers.js";

describe("Friend Request Decline", () => {
	beforeEach(async () => {
		await cleanDatabase();
		await createTestUsers();
	});

	it("Decline friend request (happy path)", async () => {
		// Setup: Create friend request
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);

		// Action: Decline request
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/decline`);

		// Assertions: HTTP
		expect(res.status).toBe(204);

		// Assertions: DB - Request declined
		const updatedRequest = await getFriendRequestById(request.id);
		expect(updatedRequest.declined_at).not.toBeNull();
		expect(updatedRequest.accepted_at).toBeNull();

		// Assertions: DB - No friendship created
		expect(await areFriends(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id)).toBe(false);
	});

	it("Cannot decline twice", async () => {
		// Setup: Create and decline request
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);
		const res1 = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/decline`);
		expect(res1.status).toBe(204);

		// Action: Try to decline again
		const res2 = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/decline`);

		// Assertions: Error
		expect(res2.status).toBeGreaterThanOrEqual(400);
		expect(res2.body.error).toMatch(/no longer pending/i);
	});

	it("Wrong user cannot decline", async () => {
		// Setup: Request for INVITEE
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);

		// Action: STRANGER tries to decline
		const res = await makeRequest(TEST_USERS.STRANGER.id).post(`/api/friends/requests/${request.id}/decline`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/not your friend request/i);

		// Assertions: DB - Request unchanged
		const updatedRequest = await getFriendRequestById(request.id);
		expect(updatedRequest.declined_at).toBeNull();
	});

	it("Cannot decline after accept", async () => {
		// Setup: Create and accept request
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`);

		// Action: Try to decline
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/decline`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/no longer pending/i);

		// Assertions: DB - Friendship still exists
		expect(await areFriends(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id)).toBe(true);
	});
});
