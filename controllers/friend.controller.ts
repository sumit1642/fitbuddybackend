// controllers/friend.controller.ts
import { Response, NextFunction } from "express";
import type { Request } from "express";
import { FriendService } from "../services/friend.service.js";

export const FriendController = {
	/**
	 * POST /friends/requests
	 * Send a friend request
	 */
	async sendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { toUserId } = req.body;
			const request = await FriendService.sendRequest(req.user.id, toUserId);
			res.status(201).json(request);
		} catch (err) {
			next(err);
		}
	},

	/**
	 * POST /friends/requests/:id/accept
	 * Accept a friend request
	 */
	async acceptRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const requestId = req.params.id;
			if (!requestId) {
				res.status(400).json({ error: "Request ID is required" });
				return;
			}
			await FriendService.acceptRequest(requestId, req.user.id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},

	/**
	 * POST /friends/requests/:id/decline
	 * Decline a friend request
	 */
	async declineRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const requestId = req.params.id;
			if (!requestId) {
				res.status(400).json({ error: "Request ID is required" });
				return;
			}
			await FriendService.declineRequest(requestId, req.user.id);
			res.status(204).send();
		} catch (err) {
			next(err);
		}
	},

	/**
	 * GET /friends/requests/pending
	 * List pending friend requests for current user
	 */
	async listPendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const requests = await FriendService.listPendingRequests(req.user.id);
			res.json(requests);
		} catch (err) {
			next(err);
		}
	},

	/**
	 * GET /friends
	 * List friends for current user
	 */
	async listFriends(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const friends = await FriendService.listFriends(req.user.id);
			res.json(friends);
		} catch (err) {
			next(err);
		}
	},

	/**
	 * GET /friends/:userId
	 * Check if current user is friends with another user
	 */
	async checkFriendship(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const { userId } = req.params;
			if (!userId) {
				res.status(400).json({ error: "User ID is required" });
				return;
			}
			const areFriends = await FriendService.areFriends(req.user.id, userId);
			res.json({ areFriends });
		} catch (err) {
			next(err);
		}
	},
};
