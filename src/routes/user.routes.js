import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.route("/register").post(
    upload.fields([
        //one object for avatar upload
        {
            name: "avatar",
            maxCount: 1
        },
        //another for coverImage
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser);


export default router;
