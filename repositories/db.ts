import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const dbPool = new Pool({
	host: env.DB_HOST,
	port: env.DB_PORT,
	database: env.DB_NAME,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	ssl: false,
});

dbPool.on("connect", () => {
	console.log("📦 PostgreSQL connected");
});

dbPool.on("error", (err) => {
	console.error("❌ PostgreSQL error", err);
	process.exit(1);
});
