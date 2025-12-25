import { InviteRepository } from "../repositories/invite.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { SessionParticipantRepository } from "../repositories/sessionParticipant.repository.js";
import { ConnectionManager } from "../realtime/connection.manager.js";
import { getSocketServer } from "../realtime/socket.server.js";
import { RealtimeEvents } from "../realtime/events.js";
import { AuthedSocket } from "../realtime/types.js";

export const InviteService = {
	async sendInvite(fromUserId: string, toUserId: string, sessionId: string) {
		const session = await SessionRepository.findById(sessionId);
		if (!session) throw new Error("Session not found");
		if (session.owner_user_id !== fromUserId) throw new Error("Only owner can invite");

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

		await InviteRepository.markAccepted(inviteId);

		await SessionParticipantRepository.addParticipant(invite.session_id, userId, "invited");

		// Phase 6 handoff
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
