// routes/sessions.routes.ts

import { Router } from "express";
import { startSession, stopSession } from "../controllers/session.controller.js";
import { fakeAuth } from "../middleware/fakeAuth.middleware.js";

const router = Router();

router.post("/start", fakeAuth, startSession);
router.post("/stop", fakeAuth, stopSession);

export default router;
