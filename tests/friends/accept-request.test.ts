// tests/friends/accept-request.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase } from "../setup/db.js";
import { createTestUsers, TEST_USERS } from "../setup/users.js";
import { makeRequest, createTestFriendRequest, getFriendRequestById, areFriends } from "../setup/helpers.js";

describe("Friend Request Accept", () => {
	beforeEach(async () => {
		await cleanDatabase();
		await createTestUsers();
	});

	it("Accept friend request (happy path)", async () => {
		// Setup: Create friend request
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);

		// Action: Accept request
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`);

		// Assertions: HTTP
		expect(res.status).toBe(204);

		// Assertions: DB - Request accepted
		const updatedRequest = await getFriendRequestById(request.id);
		expect(updatedRequest.accepted_at).not.toBeNull();
		expect(updatedRequest.declined_at).toBeNull();

		// Assertions: DB - Friendship created (bidirectional)
		expect(await areFriends(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id)).toBe(true);
		expect(await areFriends(TEST_USERS.INVITEE.id, TEST_USERS.OWNER.id)).toBe(true);
	});

	it("Cannot accept request twice (idempotency)", async () => {
		// Setup: Create and accept request
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);
		const res1 = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`);
		expect(res1.status).toBe(204);

		// Action: Try to accept again
		const res2 = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`);

		// Assertions: Error
		expect(res2.status).toBeGreaterThanOrEqual(400);
		expect(res2.body.error).toMatch(/no longer pending/i);
	});

	it("Concurrent accept (race condition)", async () => {
		// Setup: Create friend request
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);

		// Action: Fire two concurrent accepts
		const [res1, res2] = await Promise.all([
			makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`),
			makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`),
		]);

		// Assertions: Exactly one succeeds
		const statuses = [res1.status, res2.status].sort();
		expect(statuses[0]).toBeLessThan(300); // One success
		expect(statuses[1]).toBeGreaterThanOrEqual(400); // One failure

		// Assertions: DB - Request accepted once
		const updatedRequest = await getFriendRequestById(request.id);
		expect(updatedRequest.accepted_at).not.toBeNull();
		expect(updatedRequest.declined_at).toBeNull();

		// Assertions: DB - Friendship exists
		expect(await areFriends(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id)).toBe(true);
	});

	it("Wrong user cannot accept", async () => {
		// Setup: Request for INVITEE
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);

		// Action: STRANGER tries to accept
		const res = await makeRequest(TEST_USERS.STRANGER.id).post(`/api/friends/requests/${request.id}/accept`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/not your friend request/i);

		// Assertions: DB - Request unchanged
		const updatedRequest = await getFriendRequestById(request.id);
		expect(updatedRequest.accepted_at).toBeNull();
	});

	it("Cannot accept after decline", async () => {
		// Setup: Create and decline request
		const request = await createTestFriendRequest(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id);
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/decline`);

		// Action: Try to accept
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/friends/requests/${request.id}/accept`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/no longer pending/i);

		// Assertions: DB - No friendship
		expect(await areFriends(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id)).toBe(false);
	});
});
