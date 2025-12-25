// controllers/invite.controller.ts
import { Request, Response, NextFunction } from "express"
import { InviteService } from "../services/invite.service.js";

export const InviteController = {
	async send(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { toUserId, sessionId } = req.body;
			const invite = await InviteService.sendInvite(req.user.id, toUserId, sessionId);
			res.status(201).json(invite);
		} catch (err) {
			next(err);
		}
	},

	async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const inviteId = req.params.id;
			if (!inviteId) {
				res.status(400).json({ error: "Invite ID is required" });
				return;
			}
			await InviteService.acceptInvite(inviteId, req.user.id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},

	async decline(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const inviteId = req.params.id;
			if (!inviteId) {
				res.status(400).json({ error: "Invite ID is required" });
				return;
			}
			await InviteService.declineInvite(inviteId, req.user.id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},

	async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const inviteId = req.params.id;
			if (!inviteId) {
				res.status(400).json({ error: "Invite ID is required" });
				return;
			}
			await InviteService.revokeInvite(inviteId, req.user.id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},
};
