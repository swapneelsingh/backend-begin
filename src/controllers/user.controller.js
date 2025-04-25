import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const registerAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        //saving refresh token into DB
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})

        return ({accessToken, refreshToken})
    }
    catch(error) {
        throw new ApiError( 500, "Something went wrong while making access and refresh token")
    }
}
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
    if ([fullname, email, username, password].some((field) => !field || field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    

    //3
    const existedUser = await User.findOne ({
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
        new ApiResponse(200, isUserCreated, "User Registered Successfully !!!! 🔥")
    )
})

const loginUser = asyncHandler(async(req, res) =>   {
    // req body —> data
    // username or email
    // find the user
    // password check
    // MOST-IMPORTANT ===> access and refresh token (form a separate method for this)
    // send cookie

    const {email, username, password} = req.body;
     
    if(!email && !username)
    {
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({ 
        $or: [{username: username}, {email: email}]
    });
    console.log(user._id);

    if(!user) {
        throw new ApiError(404, "User do not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid Password")
    }

    //call to form access and refresh token
    const {accessToken, refreshToken} = await registerAccessAndRefreshTokens(user._id); 

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse (
            200, {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )

})

//logout user by making a middleware
// const logoutUser = asyncHandler(async(req, res) => {
//     console.log(req.body);
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $set: {
//                 refreshToken: undefined
//             }
//         },
//         {
//             new: true
//         }
//     )
//     const options = {
//         httpOnly: true,
//         secure: true,
//         sameSite: "strict"
//     }

//     return res
//     .status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(new ApiResponse(200, {}, "User logged out Successfully"))

// })
const logoutUser = asyncHandler(async(req, res) => {
    console.log("===== LOGOUT DEBUG INFO =====");
    console.log("Request cookies:", req.cookies);
    console.log("Request headers:", req.headers);
    console.log("Auth header:", req.header("Authorization"));
    console.log("req.user:", req.user);
    
    if (!req.user) {
        console.log("ERROR: req.user is not defined - auth middleware may not be working");
        return res.status(401).json(new ApiResponse(401, {}, "User not authenticated"));
    }
    
    console.log("User ID for logout:", req.user._id);
    
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        );
        console.log("User after refresh token removal:", updatedUser ? "Success" : "Not found");
        
        const options = {
            httpOnly: true,
            secure: true
        };
        
        console.log("Clearing cookies with options:", options);
        
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out Successfully"));
    } catch (error) {
        console.log("Error during logout:", error);
        throw new ApiError(500, "Error during logout process");
    }
});

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )
        
            const user = await User.findById(decodedToken?._id)
        
            if(!user) {
                throw new ApiError(401, "Invalid RefreshToken")
            }
        
            if(incomingRefreshToken !== user?.refreshToken) {
                throw new ApiError(401, "Refresh token is expired or used")
            }
        
            const options  = {
                httpOnly: true,
                secure: true
            }
        
            const {accessToken, newRefreshToken} = await registerAccessAndRefreshTokens(user._id);
        
        
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    {accessToken, refreshToken: newRefreshToken},
                    "Access Token Refreshed."
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }


})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};