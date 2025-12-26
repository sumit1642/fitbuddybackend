// tests/invites/accept.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io-client";
import { cleanDatabase } from "../setup/db.js";
import { createTestUsers, TEST_USERS } from "../setup/users.js";
import {
	makeRequest,
	createTestSession,
	createTestInvite,
	getInviteById,
	getParticipantBySessionAndUser,
	countParticipants,
	getSessionById,
} from "../setup/helpers.js";
import { createTestSocket, waitForConnection, waitForEvent, disconnectSocket } from "../setup/sockets.js";
import { dbPool } from "../../repositories/db.js";

describe("Invite Accept", () => {
	let inviteeSocket: Socket;

	beforeEach(async () => {
		await cleanDatabase();
		await createTestUsers();
	});

	afterEach(async () => {
		if (inviteeSocket) {
			await disconnectSocket(inviteeSocket);
		}
	});

	it("Flow 3: Accept invite (happy path)", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Setup: Connect invitee socket
		inviteeSocket = createTestSocket(TEST_USERS.INVITEE.id);
		await waitForConnection(inviteeSocket);

		// Listen for socket event
		const eventPromise = waitForEvent(inviteeSocket, "user_joined");

		// Action: Accept invite
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);

		// Assertions: HTTP
		expect(res.status).toBe(204);

		// Assertions: DB - Session still active
		const activeSession = await getSessionById(session.id);
		expect(activeSession).toBeTruthy();
		expect(activeSession.ended_at).toBeNull();

		// Assertions: DB - Invite accepted
		const updatedInvite = await getInviteById(invite.id);
		expect(updatedInvite.accepted_at).not.toBeNull();

		// Assertions: DB - Participant created
		const participant = await getParticipantBySessionAndUser(session.id, TEST_USERS.INVITEE.id);
		expect(participant).toBeTruthy();
		expect(participant.role).toBe("invited");

		// Assertions: Socket - user_joined event
		const event = await eventPromise;
		expect(event.session_id).toBe(session.id);
		expect(event.user_id).toBe(TEST_USERS.INVITEE.id);
		expect(event.role).toBe("invited");
	});

	it("Flow 4: Accept invite twice (idempotency)", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Setup: Connect socket
		inviteeSocket = createTestSocket(TEST_USERS.INVITEE.id);
		await waitForConnection(inviteeSocket);

		// Action: Accept once
		const res1 = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);
		expect(res1.status).toBe(204);

		// Action: Accept again
		const res2 = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);

		// Assertions: Second attempt fails
		expect(res2.status).toBeGreaterThanOrEqual(400);
		expect(res2.body.error).toMatch(/no longer pending/i);

		// Assertions: DB - Only one participant
		const participantCount = await countParticipants(session.id);
		expect(participantCount).toBe(2); // owner + invitee
	});

	it("Flow 5: Concurrent accept (true race)", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Setup: Connect socket
		inviteeSocket = createTestSocket(TEST_USERS.INVITEE.id);
		await waitForConnection(inviteeSocket);

		// Action: Fire two concurrent accepts
		const [res1, res2] = await Promise.all([
			makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`),
			makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`),
		]);

		// Assertions: Exactly one succeeds
		const statuses = [res1.status, res2.status].sort();
		expect(statuses[0]).toBeLessThan(300); // One success
		expect(statuses[1]).toBeGreaterThanOrEqual(400); // One failure

		// Assertions: DB - Exactly one participant (plus owner = 2 total)
		const participantCount = await countParticipants(session.id);
		expect(participantCount).toBe(2);

		// Assertions: DB - Invite accepted once
		const updatedInvite = await getInviteById(invite.id);
		expect(updatedInvite.accepted_at).not.toBeNull();
		expect(updatedInvite.declined_at).toBeNull();
	});

	it("Flow 7: Accept after decline", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Setup: Decline invite
		await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/decline`);

		// Action: Try to accept
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/no longer pending/i);

		// Assertions: DB - No participant created
		const participant = await getParticipantBySessionAndUser(session.id, TEST_USERS.INVITEE.id);
		expect(participant).toBeNull();
	});

	it("Flow 10: Accept after revoke", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Verify session is active
		const activeSession = await getSessionById(session.id);
		expect(activeSession.ended_at).toBeNull();

		// Setup: Owner revokes
		await makeRequest(TEST_USERS.OWNER.id).post(`/api/invites/${invite.id}/revoke`);

		// Action: Try to accept
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);

		// Assertions: DB - No participant
		const participant = await getParticipantBySessionAndUser(session.id, TEST_USERS.INVITEE.id);
		expect(participant).toBeNull();
	});

	it("Flow 11: Accept after session ended", async () => {
		// Setup: Session + Invite
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Setup: End session
		await dbPool.query("UPDATE run_sessions SET ended_at = now(), ended_reason = 'completed' WHERE id = $1", [
			session.id,
		]);

		// Verify session is ended
		const endedSession = await getSessionById(session.id);
		expect(endedSession.ended_at).not.toBeNull();
		expect(endedSession.ended_reason).toBe("completed");

		// Action: Try to accept
		const res = await makeRequest(TEST_USERS.INVITEE.id).post(`/api/invites/${invite.id}/accept`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/no longer active/i);

		// Assertions: DB - Invite unchanged
		const updatedInvite = await getInviteById(invite.id);
		expect(updatedInvite.accepted_at).toBeNull();

		// Assertions: DB - No participant
		const participant = await getParticipantBySessionAndUser(session.id, TEST_USERS.INVITEE.id);
		expect(participant).toBeNull();
	});

	it("Accept: Wrong user cannot accept", async () => {
		// Setup: Session + Invite for INVITEE
		const session = await createTestSession(TEST_USERS.OWNER.id);
		const invite = await createTestInvite(TEST_USERS.OWNER.id, TEST_USERS.INVITEE.id, session.id);

		// Action: STRANGER tries to accept
		const res = await makeRequest(TEST_USERS.STRANGER.id).post(`/api/invites/${invite.id}/accept`);

		// Assertions: Error
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.error).toMatch(/not your invite/i);
	});
});
