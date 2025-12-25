import { InviteRepository } from "../repositories/invite.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { SessionParticipantRepository } from "../repositories/sessionParticipant.repository.js";
import { UserSettingsRepository } from "../repositories/user-settings.repository.js";
import { ConnectionManager } from "../realtime/connection.manager.js";
import { getSocketServer } from "../realtime/socket.server.js";
import { RealtimeEvents } from "../realtime/events.js";
import { AuthedSocket } from "../realtime/types.js";
import { dbPool } from "../repositories/db.js";

export const InviteService = {
	async sendInvite(fromUserId: string, toUserId: string, sessionId: string) {
		// 1. Check session exists and sender is owner
		const session = await SessionRepository.findById(sessionId);
		if (!session) throw new Error("Session not found");
		if (session.owner_user_id !== fromUserId) throw new Error("Only owner can invite");

		// 2. Check recipient's invite permissions
		const toUserSettings = await UserSettingsRepository.findByUserId(toUserId);

		if (!toUserSettings) {
			throw new Error("Recipient user settings not found");
		}

		if (toUserSettings.invite_permissions === "none") {
			throw new Error("User has disabled invites");
		}

		// TODO: Implement 'friends' check when friendship system exists
		if (toUserSettings.invite_permissions === "friends") {
			throw new Error("Friend-only invites not yet implemented");
		}

		// 3. Create invite
		return InviteRepository.create(fromUserId, toUserId, sessionId, session.type);
	},

	async acceptInvite(inviteId: string, userId: string) {
		const invite = await InviteRepository.findById(inviteId);
		if (!invite) throw new Error("Invite not found");

		if (invite.to_user_id !== userId) {
			throw new Error("Not your invite");
		}

		if (invite.accepted_at || invite.declined_at || invite.revoked_at) {
			throw new Error("Invite not pending");
		}

		const session = await SessionRepository.findById(invite.session_id);
		if (!session || session.ended_at) {
			throw new Error("Session no longer active");
		}

		// Transaction: Mark invite accepted + Add participant atomically
		const client = await dbPool.connect();
		try {
			await client.query("BEGIN");

			// Mark invite accepted using repository (within transaction)
			await InviteRepository.markAccepted(inviteId, client);

			// Add participant using repository (within transaction)
			// Repository handles idempotency with ON CONFLICT
			await SessionParticipantRepository.addParticipant(invite.session_id, userId, "invited", client);

			await client.query("COMMIT");
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}

		// Phase 6 handoff: Join socket rooms and emit events
		const io = getSocketServer();
		const userSockets = ConnectionManager.getSockets(userId);

		userSockets.forEach((socketId) => {
			const socket = io.sockets.sockets.get(socketId) as AuthedSocket | undefined;
			if (socket) {
				socket.join(`session:${invite.session_id}`);
				socket.sessionId = invite.session_id;
			}
		});

		io.to(`session:${invite.session_id}`).emit(RealtimeEvents.USER_JOINED, {
			session_id: invite.session_id,
			user_id: userId,
			role: "invited",
			timestamp: new Date().toISOString(),
		});
	},

	async declineInvite(inviteId: string, userId: string) {
		const invite = await InviteRepository.findById(inviteId);
		if (!invite) throw new Error("Invite not found");
		if (invite.to_user_id !== userId) throw new Error("Not your invite");

		if (invite.accepted_at || invite.declined_at || invite.revoked_at) {
			throw new Error("Invite not pending");
		}

		await InviteRepository.markDeclined(inviteId);
	},

	async revokeInvite(inviteId: string, ownerId: string) {
		const invite = await InviteRepository.findById(inviteId);
		if (!invite) throw new Error("Invite not found");

		const session = await SessionRepository.findById(invite.session_id);
		if (!session || session.owner_user_id !== ownerId) {
			throw new Error("Only owner can revoke");
		}

		if (invite.accepted_at || invite.declined_at || invite.revoked_at) {
			throw new Error("Invite not pending");
		}

		await InviteRepository.markRevoked(inviteId);
	},
};
