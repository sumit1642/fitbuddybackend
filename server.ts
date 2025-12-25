import express from "express";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import "./repositories/db.js";
import { initRedis } from "./infrastructure/redis/client.js";

const app = express();

app.use(express.json());

// routes
app.use("/api", routes);

// error handler (last)
app.use(errorHandler);

await initRedis();


app.listen(env.PORT, () => {
	console.log(`🚀 Server running on http://localhost:${env.PORT}`);
});
