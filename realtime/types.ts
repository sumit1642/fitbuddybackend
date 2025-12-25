// realtime/types.ts
import { Socket } from "socket.io";

export type AuthedSocket = Socket & {
	userId: string | undefined;
	sessionId: string | undefined;
};
