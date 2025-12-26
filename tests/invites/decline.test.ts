// tests/invites/decline.test.ts
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

describe("Invite Decline", () => {
	beforeEach(async () => {
		await cleanDatabase();
		await createTestUsers();
	});

	it("Flow 6: Decline invite", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Action: Decline invite
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/decline`);

		// Assertions: HTTP
		expect(res.status).toBe(204);

		// Assertions: DB - Invite declined
		const updatedInvite = await getInviteById(invite.id);
		expect(updatedInvite.declined_at).not.toBeNull();
		expect(updatedInvite.accepted_at).toBeNull();

		// Assertions: DB - No participant created
		const participant = await getParticipantBySessionAndUser(session.id, TEST_USERS.INVITEE.id);
		expect(participant).toBeNull();

		// No socket events (silent failure is intentional)
	});

	it("Decline: Cannot decline twice", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Action: Decline once
		const res1 = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/decline`);
		expect(res1.status).toBe(204);

		// Action: Decline again
		const res2 = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/decline`);

		// Assertions: Error
		expect(res2.status).toBeGreaterThanOrEqual(400);
		expect(res2.body.error).toMatch(/no longer pending/i);
	});

	it("Decline: Wrong user cannot decline", async () => {
		// Setup: Session + Invite for INVITEE
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Action: STRANGER tries to decline
		const res = await makeRequest(TEST_USERS.STRANGER.id).post(`/api/invites/${invite.id}/decline`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/not your invite/i);
	});

	it("Decline: Cannot decline after accept", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Setup: Accept invite
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);

		// Action: Try to decline
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/decline`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/no longer pending/i);
	});
});
