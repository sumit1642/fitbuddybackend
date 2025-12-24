import { Request, Response, NextFunction } from "express";

export function fakeAuth(req: Request, _res: Response, next: NextFunction) {
	req.user = {
		id: "00000000-0000-0000-0000-000000000000",
		email: "dev@local",
	};
	next();
}
