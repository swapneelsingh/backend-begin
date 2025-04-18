import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public")) //Serves static files (like images, CSS, etc.) from the public folder.
app.use(cookieParser())

//Routes Import
import userRouter from "./routes/user.routes.js"

//Declaration of Routes
app.use("/api/v1/users", userRouter);
// how will it look : http://localhost:8000/api/v1/users

export {app} 