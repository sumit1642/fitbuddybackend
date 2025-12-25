// domain/types.ts

import { SessionType, SessionEndReason, InvitePermissions } from "./constants.js";

/**
 * A run session.
 * Active if ended_at === null.
 */
export interface Session {
	id: string;
	owner_user_id: string;
	type: SessionType;

	started_at: Date;
	ended_at: Date | null;
	ended_reason: SessionEndReason | null;
}

/**
 * A user participating in a session.
 * Active if left_at === null.
 */
export interface SessionParticipant {
	session_id: string;
	user_id: string;

	role: "owner" | "invited";

	joined_at: Date;
	left_at: Date | null;
}

/**
 * An invite sent from one user to another.
 * State is derived from accepted_at / declined_at.
 */
export interface Invite {
	id: string;

	from_user_id: string;
	to_user_id: string;

	session_type: SessionType;

	created_at: Date;
	accepted_at: Date | null;
	declined_at: Date | null;
}

/**
 * User settings relevant to invitations.
 */
export interface UserSettings {
	user_id: string;
	invite_permissions: InvitePermissions;
}
