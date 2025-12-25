// middleware/error.middleware.ts

import { Request, Response, NextFunction } from "express";
import { DomainError } from "../domain/errors.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
	if (err instanceof DomainError) {
		switch (err.code) {
			case "SESSION_NOT_FOUND":
				return res.status(404).json({ error: err.message });

			case "SESSION_ALREADY_ENDED":
				return res.status(409).json({ error: err.message });

			case "UNAUTHORIZED_ACTION":
				return res.status(403).json({ error: err.message });

			default:
				return res.status(400).json({ error: err.message });
		}
	}

	console.error(err);
	return res.status(500).json({ error: "Internal Server Error" });
}
