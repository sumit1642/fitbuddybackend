import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*.test.ts"],
		testTimeout: 10000,
		hookTimeout: 10000,
		setupFiles: ["./tests/setup/global-setup.ts"],
		// Run tests sequentially to avoid race conditions between test files
		fileParallelism: false,
	},
});
