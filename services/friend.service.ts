// services/friend.service.ts
import { FriendRepository, FriendRequestRepository } from "../repositories/friend.repository.js";
import { dbPool } from "../repositories/db.js";
import {
	FriendRequestNotFoundError,
	FriendRequestNotPendingError,
	NotYourFriendRequestError,
	AlreadyFriendsError,
} from "../domain/errors.js";
import type { FriendRequest } from "../domain/types.js";

export const FriendService = {
	/**
	 * Send a friend request.
	 * Blocks if already friends or request already exists (DB enforces).
	 */
	async sendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest> {
		// Prevent self-friendship
		if (fromUserId === toUserId) {
			throw new Error("Cannot send friend request to self");
		}

		// Check if already friends
		const alreadyFriends = await FriendRepository.areFriends(fromUserId, toUserId);
		if (alreadyFriends) {
			throw new AlreadyFriendsError();
		}

		// Create request (DB will reject duplicate pending via unique index)
		const request = await FriendRequestRepository.create(fromUserId, toUserId);

		return {
			id: request.id,
			from_user_id: request.from_user_id,
			to_user_id: request.to_user_id,
			created_at: new Date(request.created_at),
			accepted_at: request.accepted_at ? new Date(request.accepted_at) : null,
			declined_at: request.declined_at ? new Date(request.declined_at) : null,
		};
	},

	/**
	 * Accept a friend request.
	 * Race-safe transaction:
	 * - Mark request accepted
	 * - Create bidirectional friendship
	 * Only one concurrent accept succeeds.
	 */
	async acceptRequest(requestId: string, userId: string): Promise<void> {
		const request = await FriendRequestRepository.findById(requestId);
		if (!request) {
			throw new FriendRequestNotFoundError(requestId);
		}

		if (request.to_user_id !== userId) {
			throw new NotYourFriendRequestError();
		}

		// Race-safe pre-check (advisory only, real guard is in markAccepted)
		if (request.accepted_at || request.declined_at) {
			throw new FriendRequestNotPendingError();
		}

		// Transaction: Atomically accept request + create friendship
		const client = await dbPool.connect();
		try {
			await client.query("BEGIN");

			// CRITICAL: markAccepted returns false if already processed
			// This is the REAL race guard - only one caller succeeds
			const accepted = await FriendRequestRepository.markAccepted(requestId, client);

			if (!accepted) {
				// Someone else already accepted/declined this request
				// Roll back and fail gracefully
				await client.query("ROLLBACK");
				throw new FriendRequestNotPendingError();
			}

			// Create bidirectional friendship
			await FriendRepository.createFriendship(request.from_user_id, request.to_user_id, client);

			await client.query("COMMIT");
		} catch (err) {
			await client.query("ROLLBACK");
			throw err;
		} finally {
			client.release();
		}
	},

	/**
	 * Decline a friend request.
	 */
	async declineRequest(requestId: string, userId: string): Promise<void> {
		const request = await FriendRequestRepository.findById(requestId);
		if (!request) {
			throw new FriendRequestNotFoundError(requestId);
		}

		if (request.to_user_id !== userId) {
			throw new NotYourFriendRequestError();
		}

		// Race-safe pre-check (advisory)
		if (request.accepted_at || request.declined_at) {
			throw new FriendRequestNotPendingError();
		}

		// markDeclined is now race-safe with WHERE guards
		const declined = await FriendRequestRepository.markDeclined(requestId);

		if (!declined) {
			throw new FriendRequestNotPendingError();
		}
	},

	/**
	 * Check if two users are friends.
	 * Used by invite permission checking.
	 */
	async areFriends(userA: string, userB: string): Promise<boolean> {
		return FriendRepository.areFriends(userA, userB);
	},
};
