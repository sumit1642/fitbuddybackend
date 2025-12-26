// routes/friends.routes.ts
import { Router } from "express";
import { FriendController } from "../controllers/friend.controller.js";
import { fakeAuth } from "../middleware/fakeAuth.middleware.js";

const router = Router();

router.use(fakeAuth);

// Friend requests
router.post("/requests", FriendController.sendRequest);
router.post("/requests/:id/accept", FriendController.acceptRequest);
router.post("/requests/:id/decline", FriendController.declineRequest);
router.get("/requests/pending", FriendController.listPendingRequests);

// Friends
router.get("/", FriendController.listFriends);
router.get("/:userId", FriendController.checkFriendship);

export default router;
