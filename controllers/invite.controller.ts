import { InviteService } from "../services/invite.service.js";

export const InviteController = {
	async send(req, res, next) {
		try {
			const { toUserId, sessionId } = req.body;
			const invite = await InviteService.sendInvite(req.user.id, toUserId, sessionId);
			res.status(201).json(invite);
		} catch (err) {
			next(err);
		}
	},

	async accept(req, res, next) {
		try {
			await InviteService.acceptInvite(req.params.id, req.user.id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},

	async decline(req, res, next) {
		try {
			await InviteService.declineInvite(req.params.id, req.user.id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},

	async revoke(req, res, next) {
		try {
			await InviteService.revokeInvite(req.params.id, req.user.id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},
};
