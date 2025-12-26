import dotenv from "dotenv";

// Load test env if NODE_ENV is test
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env.local";
dotenv.config({ path: envFile });

function requireEnv(key: string): string {
	const value = process.env[key];

	if (!value) {
		throw new Error(`Missing env vars : ${key}`);
	}
	return value;
}

export const env = {
	NODE_ENV: process.env.NODE_ENV ?? "local",
	PORT: Number(process.env.PORT ?? 3000),

	DB_HOST: requireEnv("DB_HOST"),
	DB_PORT: Number(requireEnv("DB_PORT")),
	DB_NAME: requireEnv("DB_NAME"),
	DB_USER: requireEnv("DB_USER"),
	DB_PASSWORD: requireEnv("DB_PASSWORD"),
};
