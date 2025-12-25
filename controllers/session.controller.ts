// controllers/session.controller.ts

import { Request, Response, NextFunction } from "express";
import { SessionService } from "../services/session.service.js";
import { SessionType, SessionEndReason } from "../domain/constants.js";
import { SessionNotFoundError, SessionAlreadyEndedError, UnauthorizedActionError } from "../domain/errors.js";

/**
 * POST /sessions/start
 */
export async function startSession(req: Request, res: Response, next: NextFunction) {
	try {
		const userId = req.user.id;
		const { type } = req.body as { type: SessionType };

		const session = await SessionService.startSession(userId, type);

		res.status(201).json(session);
	} catch (err) {
		next(err);
	}
}

/**
 * POST /sessions/stop
 */
export async function stopSession(req: Request, res: Response, next: NextFunction) {
	try {
		const userId = req.user.id;
		const { sessionId, reason } = req.body as {
			sessionId: string;
			reason: SessionEndReason;
		};

		await SessionService.stopSession(userId, sessionId, reason);

		res.status(204).send();
	} catch (err) {
		next(err);
	}
}
