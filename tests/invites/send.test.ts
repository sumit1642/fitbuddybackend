// tests/invites/send.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { cleanDatabase } from "../setup/db.js";
import { createTestUsers, TEST_USERS } from "../setup/users.js";
import { makeRequest, createTestSession, getInviteById } from "../setup/helpers.js";

describe("Invite Send", () => {
	beforeEach(async () => {
		await cleanDatabase();
		await createTestUsers();
	});

	it("Flow 1: Send invite (happy path)", async () => {
		// Setup: Owner creates session
		const session = await createTestSession(TEST_USERS.OWNER.id);

		// Action: Send invite
		const res = await makeRequest(TEST_USERS.OWNER.id).post("/api/invites").send({
			toUserId: TEST_USERS.INVITEE.id,
			sessionId: session.id,
		});

		// Assertions: HTTP
		expect(res.status).toBe(201);
		expect(res.body).toHaveProperty("id");

		// Assertions: DB - Invite row exists
		const invite = await getInviteById(res.body.id);
		expect(invite).toBeTruthy();
		expect(invite.from_user_id).toBe(TEST_USERS.OWNER.id);
		expect(invite.to_user_id).toBe(TEST_USERS.INVITEE.id);
		expect(invite.session_id).toBe(session.id);

		// Assertions: DB - State is pending
		expect(invite.accepted_at).toBeNull();
		expect(invite.declined_at).toBeNull();
		expect(invite.revoked_at).toBeNull();

		// No socket events tested here (send is purely declarative)
	});

	it("Flow 2: Send invite (permission denied)", async () => {
		// Setup: Owner creates session, STRANGER has permissions = 'none'
		const session = await createTestSession(TEST_USERS.OWNER.id);

		// Action: Try to send invite to STRANGER
		const res = await makeRequest(TEST_USERS.OWNER.id).post("/api/invites").send({
			toUserId: TEST_USERS.STRANGER.id,
			sessionId: session.id,
		});

		// Assertions: HTTP error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.status).toBeLessThan(500);

		// Assertions: DB - NO invite row exists
		const invites = await getInviteById(res.body.id);
		expect(invites).toBeNull();
	});

	it("Send invite: Non-owner cannot invite", async () => {
		// Setup: Owner creates session
		const session = await createTestSession(TEST_USERS.OWNER.id);

		// Action: INVITEE (not owner) tries to send invite
		const res = await makeRequest(TEST_USERS.INVITEE.id).post("/api/invites").send({
			toUserId: TEST_USERS.STRANGER.id,
			sessionId: session.id,
		});

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	it("Send invite: Session not found", async () => {
		// Action: Try to invite to non-existent session
		const res = await makeRequest(TEST_USERS.OWNER.id).post("/api/invites").send({
			toUserId: TEST_USERS.INVITEE.id,
			sessionId: "00000000-0000-0000-0000-999999999999",
		});

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
	});
});
