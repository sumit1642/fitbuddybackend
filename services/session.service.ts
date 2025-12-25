// services/session.service.ts

import { SessionRepository } from "../repositories/session.repository.js";
import { SessionParticipantRepository } from "../repositories/sessionParticipant.repository.js";
import { SessionType, SessionEndReason } from "../domain/constants.js";
import { SessionNotFoundError, SessionAlreadyEndedError, UnauthorizedActionError } from "../domain/errors.js";
import { Session } from "../domain/types.js";
import { PresenceService } from "./presence.service.js";
import { LocationService } from "./location.service.js";

export const SessionService = {
	/**
	 * Start a new session for a user.
	 * If an active session exists, it is ended with reason "replaced".
	 */
	async startSession(userId: string, type: SessionType): Promise<Session> {
		// 1. End existing active session (if any)
		const activeSession = await SessionRepository.findActiveByUser(userId);

		if (activeSession) {
			await SessionRepository.endSession(activeSession.id, SessionEndReason.REPLACED);

			await SessionParticipantRepository.markLeft(activeSession.id, userId);

			// Redis cleanup (best-effort)
			await PresenceService.clearPresence(userId);
			await LocationService.clearLocation(userId);
		}

		// 2. Create new session
		const newSession = await SessionRepository.createSession(userId, type);

		// 3. Add owner as participant
		await SessionParticipantRepository.addParticipant(newSession.id, userId, "owner");

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
	},
};
