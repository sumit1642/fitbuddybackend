// services/session.service.ts

import { SessionRepository } from "../repositories/session.repository.js";
import { SessionParticipantRepository } from "../repositories/sessionParticipant.repository.js";
import { SessionType, SessionEndReason } from "../domain/constants.js";
import { SessionNotFoundError, SessionAlreadyEndedError, UnauthorizedActionError } from "../domain/errors.js";
import { Session } from "../domain/types.js";
import { PresenceService } from "./presence.service.js";
import { LocationService } from "./location.service.js";
import { getSocketServer } from "../realtime/socket.server.js";
import { RealtimeEvents } from "../realtime/events.js";
import { ConnectionManager } from "../realtime/connection.manager.js";

export const SessionService = {
	/**
	 * Start a new session for a user.
	 * If an active session exists, it is ended with reason "replaced".
	 */
	async startSession(userId: string, type: SessionType): Promise<Session> {
		const io = getSocketServer();

		// 1. End existing active session (if any)
		const activeSession = await SessionRepository.findActiveByUser(userId);

		if (activeSession) {
			await SessionRepository.endSession(activeSession.id, SessionEndReason.REPLACED);

			await SessionParticipantRepository.markLeft(activeSession.id, userId);

			// Redis cleanup (best-effort)
			await PresenceService.clearPresence(userId);
			await LocationService.clearLocation(userId);

			// Leave old session room and clear sessionId
			const userSockets = ConnectionManager.getSockets(userId);
			userSockets.forEach((socketId) => {
				const socket = io.sockets.sockets.get(socketId);
				if (socket) {
					socket.leave(`session:${activeSession.id}`);
					// @ts-ignore
					socket.sessionId = undefined;
				}
			});
		}

		// 2. Create new session
		const newSession = await SessionRepository.createSession(userId, type);

		// 3. Add owner as participant
		await SessionParticipantRepository.addParticipant(newSession.id, userId, "owner");

		// 4. Join session room for owner and set sessionId context
		const userSockets = ConnectionManager.getSockets(userId);
		userSockets.forEach((socketId) => {
			const socket = io.sockets.sockets.get(socketId);
			if (socket) {
				socket.join(`session:${newSession.id}`);
				// @ts-ignore - adding sessionId to socket context
				socket.sessionId = newSession.id;
			}
		});

		// 5. Emit realtime events after DB commits
		io.emit(RealtimeEvents.SESSION_STARTED, {
			session_id: newSession.id,
			owner_user_id: userId,
			type,
			started_at: newSession.started_at,
		});

		io.emit(RealtimeEvents.USER_JOINED, {
			session_id: newSession.id,
			user_id: userId,
			role: "owner",
			timestamp: new Date().toISOString(),
		});

		return newSession;
	},

	/**
	 * Stop a session explicitly.
	 */
	async stopSession(userId: string, sessionId: string, reason: SessionEndReason): Promise<void> {
		const session = await SessionRepository.findById(sessionId);

		if (!session) {
			throw new SessionNotFoundError(sessionId);
		}

		if (session.owner_user_id !== userId) {
			throw new UnauthorizedActionError("Only the session owner can stop the session");
		}

		if (session.ended_at !== null) {
			throw new SessionAlreadyEndedError(sessionId);
		}

		await SessionRepository.endSession(sessionId, reason);

		await SessionParticipantRepository.markLeft(sessionId, userId);

		// Redis cleanup (best-effort)
		await PresenceService.clearPresence(userId);
		await LocationService.clearLocation(userId);

		// Leave session room and clear sessionId
		const io = getSocketServer();
		io.in(`session:${sessionId}`).socketsLeave(`session:${sessionId}`);

		// Clear sessionId from all user's sockets
		const userSockets = ConnectionManager.getSockets(userId);
		userSockets.forEach((socketId) => {
			const socket = io.sockets.sockets.get(socketId);
			if (socket) {
				// @ts-ignore
				socket.sessionId = undefined;
			}
		});

		// Emit realtime events after DB commits and cleanup
		io.emit(RealtimeEvents.SESSION_ENDED, {
			session_id: sessionId,
			ended_reason: reason,
			timestamp: new Date().toISOString(),
		});

		io.emit(RealtimeEvents.USER_LEFT, {
			session_id: sessionId,
			user_id: userId,
			timestamp: new Date().toISOString(),
		});
	},
};
