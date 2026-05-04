var express = require("express");
var router = express.Router();

var apiMiddleware = require("../middlewares/api");

const { 
    userPhoneVerify, 
    userOtpVerify,
    registerUser,
    userLogin,
    forgotPassword,
    resetPassword,
    changePassword,
    editProfile
} = require("../controllers/UserController");

// Existing routes
router.post("/verify_phone_no", apiMiddleware, userPhoneVerify);
router.post("/verify_otp", apiMiddleware, userOtpVerify);
router.post("/register", apiMiddleware, registerUser);
router.post("/login", apiMiddleware, userLogin);
router.post("/forgot_password", apiMiddleware, forgotPassword);
router.post("/reset_password", apiMiddleware, resetPassword);
router.post("/change_password", apiMiddleware, changePassword);
router.post("/edit_profile", apiMiddleware, editProfile);

module.exports = router;