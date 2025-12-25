// routes/index.ts

import { Router } from "express";
import { healthCheck } from "../controllers/health.controller.js";
import sessionsRouter from "./sessions.routes.js";

const router = Router();

router.get("/health", healthCheck);

router.use("/v1/sessions", sessionsRouter);

export default router;
