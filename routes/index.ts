// routes/index.ts

import { Router } from "express";
import { healthCheck } from "../controllers/health.controller.js";
import sessionsRouter from "./sessions.routes.js";
import inviteRoutes from "./invites.routes.js";

const router = Router();

router.get("/health", healthCheck);

router.use("/v1/sessions", sessionsRouter);
router.use("/invites", inviteRoutes);

export default router;
