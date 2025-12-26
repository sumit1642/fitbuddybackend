// middleware/error.middleware.ts

import { Request, Response, NextFunction } from "express";
import { DomainError } from "../domain/errors.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
	if (err instanceof DomainError) {
		switch (err.code) {
			// 404 Errors
			case "SESSION_NOT_FOUND":
			case "INVITE_NOT_FOUND":
				return res.status(404).json({ error: err.message });

			// 409 Conflict Errors
			case "SESSION_ALREADY_ENDED":
				return res.status(409).json({ error: err.message });

			// 403 Forbidden Errors
			case "UNAUTHORIZED_ACTION":
			case "NOT_YOUR_INVITE":
			case "ONLY_OWNER_CAN_INVITE":
			case "ONLY_OWNER_CAN_REVOKE":
			case "USER_DISABLED_INVITES":
				return res.status(403).json({ error: err.message });

			// 400 Bad Request Errors
			case "INVITE_NOT_PENDING":
			case "SESSION_NO_LONGER_ACTIVE":
			case "INVALID_SESSION_STATE":
			case "ACTIVE_SESSION_EXISTS":
			case "USER_SETTINGS_NOT_FOUND":
				return res.status(400).json({ error: err.message });

			// Default to 400 for unknown domain errors
			default:
				return res.status(400).json({ error: err.message });
		}
	}

	// Log unexpected errors
	console.error("Unexpected error:", err);
	return res.status(500).json({ error: "Internal Server Error" });
}
