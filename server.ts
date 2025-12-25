import http from "http";
import express from "express";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { initRedis } from "./infrastructure/redis/client.js";
import { initSocketServer } from "./realtime/socket.server.js";
import "./repositories/db.js";

const app = express();

app.use(express.json());

// routes
app.use("/api", routes);

// error handler (last)
app.use(errorHandler);

// Initialize Redis
await initRedis();

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
initSocketServer(server);

// Start server
server.listen(env.PORT, () => {
	console.log(`🚀 Server running on http://localhost:${env.PORT}`);
});
