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
