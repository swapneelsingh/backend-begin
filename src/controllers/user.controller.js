import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { config } from "dotenv";

const registerUser = asyncHandler(async(req, res) => {
    //Lecture - 12 content
    /*res.status(200).json({
        message: "ok"
    })*/

    //Lecture - 13
    //1. get user details from the frontend based on the user.model we built earlier
    //2. validation - e.g not empty
    //3. check if already exists - username, email etc.
    //4. check for images and check for avatar
    //5. upload the img and avatar to cloudinary
    //6. check if it is uploaded or not
    //7. create user object then create entry in db
    //8. remove password and refresh token field from response
    //9. check for user creation
    //10. return res

    //1
    const {fullname, email, username, password} = req.body;
    console.log("email: ",email);

    //2
    if([fullname, email, username, password].some((fields) => fields?.trim() === ""))
    {
        throw new ApiError
    }

    //3
    const existedUser = User.findOne ({
        $or: [{username}, {email}]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    //4
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //5
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    //6
    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //7
    const user = await User.create ({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //8
    const isUserCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //9
    if(!isUserCreated) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    //10
    return res.status(201).json (
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
})

export {registerUser};