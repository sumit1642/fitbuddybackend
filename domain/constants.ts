// domain/constaints.ts

/**
 * Session visiblity / mode
 * Must match DB constraints exactly
 */

export const SessionType = {
	PUBLIC: "public",
	PRIVATE: "private",
} as const;

export type SessionType = (typeof SessionType)[keyof typeof SessionType];


/**
 * Why a session ended.
 * Time-derived state, never boolean flags.
 */

export const SessionEndReason = {
	COMPLETED: "completed",
	CANCELLED: "cancelled",
	TIMEOUT: "timeout",
	REPLACED: "replaced",
	DISCONNECT: "disconnect",
} as const

export type SessionEndReason = (typeof SessionEndReason)[keyof typeof SessionEndReason]

/**
 * Who can send invites to a user.
 * Mirrors user_settings.invite_permissions.
 */
export const InvitePermissions = {
	ANYONE: "anyone",
	FRIENDS: "friends",
	NONE: "none",
} as const

export type InvitePermissions = (typeof InvitePermissions)[keyof typeof InvitePermissions];