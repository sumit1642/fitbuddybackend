// tests/invites/revoke.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase } from "../setup/db.js";
import { createTestUsers, TEST_USERS } from "../setup/users.js";
import {
	makeRequest,
	createTestSession,
	createTestInvite,
	getInviteById,
	getParticipantBySessionAndUser,
} from "../setup/helpers.js";

describe("Invite Revoke", () => {
	beforeEach(async () => {
		await cleanDatabase();
		await createTestUsers();
	});

	it("Flow 8: Revoke invite (owner)", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Action: Owner revokes
		const res = await makeRequest(TEST_USERS.OWNER.id).post(`/api/invites/${invite.id}/revoke`);

		// Assertions: HTTP
		expect(res.status).toBe(204);

		// Assertions: DB - Invite revoked
		const updatedInvite = await getInviteById(invite.id);
		expect(updatedInvite.revoked_at).not.toBeNull();

		// Assertions: Invitee cannot accept
		const acceptRes = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);
		expect(acceptRes.status).toBeGreaterThanOrEqual(400);

		// Assertions: DB - No participants created
		const participant = await getParticipantBySessionAndUser(session.id, TEST_USERS.INVITEE.id);
		expect(participant).toBeNull();

		// No socket events (revoke is silent)
	});

	it("Flow 9: Revoke by non-owner", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Action: STRANGER tries to revoke
		const res = await makeRequest(TEST_USERS.STRANGER.id).post(`/api/invites/${invite.id}/revoke`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/only owner can revoke/i);

		// Assertions: DB - Invite unchanged
		const updatedInvite = await getInviteById(invite.id);
		expect(updatedInvite.revoked_at).toBeNull();
	});

	it("Revoke: Cannot revoke twice", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Action: Revoke once
		const res1 = await makeRequest(TEST_USERS.OWNER.id).post(`/api/invites/${invite.id}/revoke`);
		expect(res1.status).toBe(204);

		// Action: Revoke again
		const res2 = await makeRequest(TEST_USERS.OWNER.id).post(`/api/invites/${invite.id}/revoke`);

		// Assertions: Error
		expect(res2.status).toBeGreaterThanOrEqual(400);
		expect(res2.body.error).toMatch(/no longer pending/i);
	});

	it("Revoke: Cannot revoke after accept", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Setup: Accept invite
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);

		// Action: Try to revoke
		const res = await makeRequest(TEST_USERS.OWNER.id).post(`/api/invites/${invite.id}/revoke`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/no longer pending/i);
	});

	it("Revoke: Invitee cannot revoke", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Action: INVITEE tries to revoke
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/revoke`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/only owner can revoke/i);
	});
});
