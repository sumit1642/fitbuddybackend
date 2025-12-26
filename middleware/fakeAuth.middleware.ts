import { Request, Response, NextFunction } from "express";

export function fakeAuth(req: Request, _res: Response, next: NextFunction) {
	// In test environment, allow overriding via header
	if (process.env.NODE_ENV === "test" && req.headers["x-user-id"]) {
		const userId = req.headers["x-user-id"] as string;
		req.user = {
			id: userId,
			email: `${userId}@test.com`,
		};
		next();
		return;
	}

	// Default dev user
	req.user = {
		id: "00000000-0000-0000-0000-000000000000",
		email: "dev@local",
	};
	next();
}
