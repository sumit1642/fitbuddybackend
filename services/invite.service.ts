// services/invite.service.ts
import { InviteRepository } from "../repositories/invite.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { SessionParticipantRepository } from "../repositories/sessionParticipant.repository.js";
import { UserSettingsRepository } from "../repositories/user-settings.repository.js";
import { ConnectionManager } from "../realtime/connection.manager.js";
import { getSocketServer } from "../realtime/socket.server.js";
import { RealtimeEvents } from "../realtime/events.js";
import { AuthedSocket } from "../realtime/types.js";
import { dbPool } from "../repositories/db.js";
import {
	SessionNotFoundError,
	OnlyOwnerCanInviteError,
	UserSettingsNotFoundError,
	UserDisabledInvitesError,
	InviteNotFoundError,
	NotYourInviteError,
	InviteNotPendingError,
	SessionNoLongerActiveError,
	OnlyOwnerCanRevokeError,
} from "../domain/errors.js";

export const InviteService = {
	async sendInvite(fromUserId: string, toUserId: string, sessionId: string) {
		// 1. Check session exists and sender is owner
		const session = await SessionRepository.findById(sessionId);
		if (!session) {
			throw new SessionNotFoundError(sessionId);
		}
		if (session.owner_user_id !== fromUserId) {
			throw new OnlyOwnerCanInviteError();
		}

		// 2. Check recipient's invite permissions
		const toUserSettings = await UserSettingsRepository.findByUserId(toUserId);

		if (!toUserSettings) {
			throw new UserSettingsNotFoundError(toUserId);
		}

		if (toUserSettings.invite_permissions === "none") {
			throw new UserDisabledInvitesError();
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
		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		if (invite.to_user_id !== userId) {
			throw new NotYourInviteError();
		}

		// Race-safe pre-check (advisory only, real guard is in markAccepted)
		if (invite.accepted_at || invite.declined_at || invite.revoked_at) {
			throw new InviteNotPendingError();
		}

		const session = await SessionRepository.findById(invite.session_id);
		if (!session || session.ended_at) {
			throw new SessionNoLongerActiveError();
		}

		// Transaction: Atomically accept invite + add participant
		const client = await dbPool.connect();
		try {
			await client.query("BEGIN");

			// CRITICAL: markAccepted returns false if already processed
			// This is the REAL race guard - only one caller succeeds
			const accepted = await InviteRepository.markAccepted(inviteId, client);

			if (!accepted) {
				// Someone else already accepted/declined/revoked this invite
				// Roll back and fail gracefully
				await client.query("ROLLBACK");
				throw new InviteNotPendingError();
			}

			// Add participant - idempotent due to ON CONFLICT
			await SessionParticipantRepository.addParticipant(invite.session_id, userId, "invited", client);

			await client.query("COMMIT");
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}

		// Realtime updates AFTER successful DB commit
		const io = getSocketServer();
		const userSockets = ConnectionManager.getSockets(userId);

		// Join session room and set context
		userSockets.forEach((socketId) => {
			const socket = io.sockets.sockets.get(socketId) as AuthedSocket | undefined;
			if (socket) {
				socket.join(`session:${invite.session_id}`);
				socket.sessionId = invite.session_id;
			}
		});

		// Notify session participants
		io.to(`session:${invite.session_id}`).emit(RealtimeEvents.USER_JOINED, {
			session_id: invite.session_id,
			user_id: userId,
			role: "invited",
			timestamp: new Date().toISOString(),
		});
	},

	async declineInvite(inviteId: string, userId: string) {
		const invite = await InviteRepository.findById(inviteId);
		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}
		if (invite.to_user_id !== userId) {
			throw new NotYourInviteError();
		}

		// Race-safe pre-check (advisory)
		if (invite.accepted_at || invite.declined_at || invite.revoked_at) {
			throw new InviteNotPendingError();
		}

		// markDeclined is now race-safe with WHERE guards
		const declined = await InviteRepository.markDeclined(inviteId);

		if (!declined) {
			throw new InviteNotPendingError();
		}
	},

	async revokeInvite(inviteId: string, ownerId: string) {
		const invite = await InviteRepository.findById(inviteId);
		if (!invite) {
			throw new InviteNotFoundError(inviteId);
		}

		const session = await SessionRepository.findById(invite.session_id);
		if (!session || session.owner_user_id !== ownerId) {
			throw new OnlyOwnerCanRevokeError();
		}

		// Race-safe pre-check (advisory)
		if (invite.accepted_at || invite.declined_at || invite.revoked_at) {
			throw new InviteNotPendingError();
		}

		// markRevoked is now race-safe with WHERE guards
		const revoked = await InviteRepository.markRevoked(inviteId);

		if (!revoked) {
			throw new InviteNotPendingError();
		}
	},
};
