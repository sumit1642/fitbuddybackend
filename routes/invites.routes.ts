import { Router } from "express";
import { InviteController } from "../controllers/invite.controller.js";
import { fakeAuth } from "../middleware/fakeAuth.middleware.js";

const router = Router();

router.use(fakeAuth);

router.post("/", InviteController.send);
router.post("/:id/accept", InviteController.accept);
router.post("/:id/decline", InviteController.decline);
router.post("/:id/revoke", InviteController.revoke);

export default router;
