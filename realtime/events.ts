export const RealtimeEvents = {
	CONNECTED: "connected",
	DISCONNECTED: "disconnected",

	USER_ONLINE: "user_online",
	USER_OFFLINE: "user_offline",

	SESSION_STARTED: "session_started",
	SESSION_ENDED: "session_ended",
	SESSION_RESUMED: "session_resumed",

	USER_JOINED: "user_joined",
	USER_LEFT: "user_left",

	LOCATION_UPDATE: "location_update",
} as const;
