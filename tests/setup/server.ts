// tests/setup/server.ts
import http from "http";
import express from "express";
import { env } from "../../config/env.js";
import routes from "../../routes/index.js";
import { errorHandler } from "../../middleware/error.middleware.js";
import { initRedis } from "../../infrastructure/redis/client.js";
import { initSocketServer } from "../../realtime/socket.server.js";

let testServer: http.Server | null = null;
let testApp: express.Express | null = null;

/**
 * Start the test server.
 * Called once before all tests.
 */
export async function startTestServer(): Promise<{ app: express.Express; server: http.Server }> {
	if (testServer) {
		return { app: testApp!, server: testServer };
	}

	const app = express();
	app.use(express.json());
	app.use("/api", routes);
	app.use(errorHandler);

	// Initialize Redis
	await initRedis();

	// Create HTTP server and attach Socket.IO
	const server = http.createServer(app);
	initSocketServer(server);

	// Start listening
	await new Promise<void>((resolve) => {
		server.listen(env.PORT, () => {
			console.log(`🧪 Test server running on port ${env.PORT}`);
			resolve();
		});
	});

	testServer = server;
	testApp = app;

	return { app, server };
}

/**
 * Stop the test server.
 * Called once after all tests.
 */
export async function stopTestServer(): Promise<void> {
	if (!testServer) return;

	await new Promise<void>((resolve, reject) => {
		testServer!.close((err) => {
			if (err) reject(err);
			else resolve();
		});
	});

	testServer = null;
	testApp = null;
}

export function getTestApp(): express.Express {
	if (!testApp) {
		throw new Error("Test server not initialized");
	}
	return testApp;
}
