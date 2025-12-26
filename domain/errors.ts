// domain/errors.ts

/**
 * Base class for all business-rule violations.
 * Services throw these. Controllers translate them.
 */

export abstract class DomainError extends Error {
	abstract readonly code: string;

	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}

/**
 * Thrown when a user tries to start a session
 * but already has an active one.
 */
export class ActiveSessionExistsError extends DomainError {
	readonly code = "ACTIVE_SESSION_EXISTS";

	constructor(userId: string) {
		super(`User ${userId} already has an active session`);
	}
}

/**
 * Thrown when session cannot be found.
 */
export class SessionNotFoundError extends DomainError {
	readonly code = "SESSION_NOT_FOUND";

	constructor(sessionId: string) {
		super(`Session ${sessionId} not found`);
	}
}

/**
 * Thrown when trying to end a session that's already ended.
 */
export class SessionAlreadyEndedError extends DomainError {
	readonly code = "SESSION_ALREADY_ENDED";

	constructor(sessionId: string) {
		super(`Session ${sessionId} has already ended`);
	}
}

/**
 * Throws when a user attempts an action which
 * they are not allowed to perform.
 */
export class UnauthorizedActionError extends DomainError {
	readonly code = "UNAUTHORIZED_ACTION";
	constructor(reason?: string) {
		super(reason ?? `User is not allowed to perform this action`);
	}
}

/**
 * Throws when the session in a state where the requested
 * operation makes sense
 */
export class InvalidSessionStateError extends DomainError {
	readonly code = "INVALID_SESSION_STATE";

	constructor(message: string) {
		super(message);
	}
}

/**
 * Thrown when an invite cannot be found.
 */
export class InviteNotFoundError extends DomainError {
	readonly code = "INVITE_NOT_FOUND";

	constructor(inviteId: string) {
		super(`Invite ${inviteId} not found`);
	}
}

/**
 * Thrown when trying to modify an invite that's no longer pending.
 */
export class InviteNotPendingError extends DomainError {
	readonly code = "INVITE_NOT_PENDING";

	constructor() {
		super("Invite no longer pending");
	}
}

/**
 * Thrown when a user tries to accept/decline an invite that's not theirs.
 */
export class NotYourInviteError extends DomainError {
	readonly code = "NOT_YOUR_INVITE";

	constructor() {
		super("Not your invite");
	}
}

/**
 * Thrown when trying to accept an invite for a session that's ended.
 */
export class SessionNoLongerActiveError extends DomainError {
	readonly code = "SESSION_NO_LONGER_ACTIVE";

	constructor() {
		super("Session no longer active");
	}
}

/**
 * Thrown when only the session owner can perform an action.
 */
export class OnlyOwnerCanInviteError extends DomainError {
	readonly code = "ONLY_OWNER_CAN_INVITE";

	constructor() {
		super("Only owner can invite");
	}
}

/**
 * Thrown when only the session owner can revoke an invite.
 */
export class OnlyOwnerCanRevokeError extends DomainError {
	readonly code = "ONLY_OWNER_CAN_REVOKE";

	constructor() {
		super("Only owner can revoke");
	}
}

/**
 * Thrown when a user has disabled invites.
 */
export class UserDisabledInvitesError extends DomainError {
	readonly code = "USER_DISABLED_INVITES";

	constructor() {
		super("User has disabled invites");
	}
}

/**
 * Thrown when user settings cannot be found.
 */
export class UserSettingsNotFoundError extends DomainError {
	readonly code = "USER_SETTINGS_NOT_FOUND";

	constructor(userId: string) {
		super(`User settings not found for user ${userId}`);
	}
}

/**
 * Thrown when a friend request cannot be found.
 */
export class FriendRequestNotFoundError extends DomainError {
	readonly code = "FRIEND_REQUEST_NOT_FOUND";

	constructor(requestId: string) {
		super(`Friend request ${requestId} not found`);
	}
}

/**
 * Thrown when trying to modify a friend request that's no longer pending.
 */
export class FriendRequestNotPendingError extends DomainError {
	readonly code = "FRIEND_REQUEST_NOT_PENDING";

	constructor() {
		super("Friend request no longer pending");
	}
}

/**
 * Thrown when a user tries to accept/decline a friend request that's not theirs.
 */
export class NotYourFriendRequestError extends DomainError {
	readonly code = "NOT_YOUR_FRIEND_REQUEST";

	constructor() {
		super("Not your friend request");
	}
}

/**
 * Thrown when trying to send a friend request to someone already a friend.
 */
export class AlreadyFriendsError extends DomainError {
	readonly code = "ALREADY_FRIENDS";

	constructor() {
		super("Already friends");
	}
}

/**
 * Thrown when trying to send a friend request to self.
 */
export class CannotFriendSelfError extends DomainError {
	readonly code = "CANNOT_FRIEND_SELF";

	constructor() {
		super("Cannot send friend request to self");
	}
}
