const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const { responseHandler } = require('../helpers/utility');
const dbQuery = require("../helpers/query");
let constants = require("../vars/constants");
let { notFoundResponse } = require("../vars/apiResponse");
const utility = require('../helpers/utility');
const jwt = require('jsonwebtoken');
const FileManager = require("../helpers/file_manager");
const moment = require('moment-timezone');
const { log } = require('console');

// User phone number verify
exports.userPhoneVerify = async (req, res) => {
    try {
        let response = { status: 'error', msg: '' };
        let bodyData = req?.body?.inputdata;

        if (utility.checkEmptyString(bodyData.user_Phone)) {
            response['msg'] = 'Phone number is required.';
            return utility.apiResponse(req, res, response);
        }

        if (!constants.vals.regex.phone_number.test(bodyData?.user_Phone)) {
            response['msg'] = 'Phone number must start with 6 and it must be 7 digits long.';
            return utility.apiResponse(req, res, response);
        }

        let condition = `WHERE user_Phone = ${bodyData?.user_Phone} AND is_active = 1 AND is_delete = 0`;
        let selectFields = 'user_Id, user_Name, user_Phone, user_Pin, user_Token';

        const checkPhoneNo = await dbQuery.fetchSingleRecord(
            constants.vals.defaultDB,
            'user',
            condition,
            selectFields
        );

        const otp = await utility.generateOtp(constants.vals.optLength);
        console.log(otp);
        console.log("dkasdksahdhjsagdhas");


        const hashedOtp = await bcrypt.hash(otp, 10);
        const date = req.locals.now;
        const localNow = moment.tz(date, 'YYYY-MM-DD HH:mm:ss', constants.vals.tz);
        const expiresAt = localNow.clone().add(constants.vals.otpExpireMinutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');

        // If phone number is NOT in system → new user flow
        if (!checkPhoneNo || checkPhoneNo.length === 0) {
            const params = {
                user_phone: bodyData?.user_Phone,
                otp_hash: hashedOtp,
                expires_at: expiresAt,
                created_at: date
            };
            await dbQuery.insertSingle(constants.vals.defaultDB, 'user_otp', params);

            try {
                await utility.sendSMS(bodyData?.user_Phone, otp);
            } catch (err) {
                response['msg'] = err?.message || 'Failed to send OTP';
                return utility.apiResponse(req, res, response);
            }

            response['status'] = 'success';
            response['msg'] = 'Phone number is new. OTP has been sent for verification.';
            response['data'] = { isNewUser: true };
            if (process.env.NODE_ENV !== 'production') {
                response['data'].dev_otp = otp;
            }
            return utility.apiResponse(req, res, response);
        }

        // Existing user → normal login OTP logic
        const userToken = jwt.sign({ phone: bodyData?.user_Phone }, 'apiservice');
        checkPhoneNo.user_Token = userToken;

        const newValue = `user_Token = '${userToken}', firebase_token = '${bodyData?.firebase_Token || ""}', updated_at = '${date}'`;
        const updateCondition = `user_Id = ${checkPhoneNo?.user_Id}`;
        await dbQuery.updateRecord(constants.vals.defaultDB, 'user', updateCondition, newValue);

        // Clean up old OTPs
        const deleteCondition = `user_Id = ${checkPhoneNo?.user_Id}`;
        await dbQuery.deleteRecord(constants.vals.defaultDB, 'user_otp', deleteCondition);

        // Store OTP for existing user
        const otpParams = {
            user_id: checkPhoneNo?.user_Id,
            otp_hash: hashedOtp,
            expires_at: expiresAt,
        };
        await dbQuery.insertSingle(constants.vals.defaultDB, 'user_otp', otpParams);

        try {
            await utility.sendSMS(bodyData?.user_Phone, otp);
        } catch (err) {
            response['msg'] = err?.message || 'Failed to send OTP';
            return utility.apiResponse(req, res, response);
        }
        await utility.addAuthenticationLogs(checkPhoneNo?.user_Id, 'Login', 'Success', req.ip);

        response['status'] = 'success';
        response['data'] = { ...checkPhoneNo, isNewUser: false };
        if (process.env.NODE_ENV !== 'production') {
            response['data'].dev_otp = otp;
        }
        response['msg'] = 'Existing phone verified successfully and OTP sent.';
        return utility.apiResponse(req, res, response);

    } catch (error) {
        throw error;
    }
};

exports.userOtpVerify = async (req, res) => {
    try {
        let response = { status: 'error', msg: '' };
        let bodyData = req?.body?.inputdata;

        if (utility.checkEmptyString(bodyData?.otp)) {
            response['msg'] = 'OTP is required.';
            return utility.apiResponse(req, res, response);
        }

        console.log(bodyData);
        console.log("dkjaskdhjsadh");

        // Either user_Id or user_Phone must be provided
        if (utility.checkEmptyString(bodyData?.user_Id) && utility.checkEmptyString(bodyData?.user_Phone)) {
            response['msg'] = 'Either user_Id or user_Phone is required.';
            return utility.apiResponse(req, res, response);
        }

        // Build condition dynamically
        let condition;
        if (bodyData?.user_Id) {
            condition = `WHERE user_Id = ${bodyData?.user_Id} ORDER BY created_at DESC LIMIT 1`;
        } else {
            condition = `WHERE user_phone = '${bodyData?.user_Phone}' ORDER BY created_at DESC LIMIT 1`;
        }

        let selectFields = 'id, user_Id, user_phone, otp_Hash, expires_at';
        const checkOtp = await dbQuery.fetchSingleRecord(constants.vals.defaultDB, 'user_otp', condition, selectFields);

        if (!checkOtp || checkOtp.length == 0) {
            response['msg'] = 'OTP not found or expired. Please request a new one.';
            return utility.apiResponse(req, res, response);
        }

        // Verify expiration
        if (checkOtp?.expires_at < req.locals.now) {
            response['msg'] = 'OTP has expired.';
            return utility.apiResponse(req, res, response);
        }

        // Compare hash
        const isMatch = await bcrypt.compare(bodyData?.otp, checkOtp?.otp_Hash);
        if (!isMatch) {
            response['msg'] = 'Invalid OTP. Please try again.';
            return utility.apiResponse(req, res, response);
        }

        // OTP is correct → delete used OTP
        const deleteCondition = `id = ${checkOtp?.id}`;
        await dbQuery.deleteRecord(constants.vals.defaultDB, 'user_otp', deleteCondition);

        // If new user → send flag to frontend to show registration form
        if (!checkOtp?.user_Id && checkOtp?.user_phone) {
            response['status'] = 'success';
            response['msg'] = 'OTP verified successfully. Proceed to registration.';
            response['data'] = {
                isNewUser: true,
                phone: checkOtp?.user_phone
            };
            return utility.apiResponse(req, res, response);
        }

        // Existing user OTP verified (can be used by forgot-password flow)
        let resetToken = null;
        if (checkOtp?.user_Id && bodyData?.user_Phone) {
            resetToken = jwt.sign(
                {
                    user_Id: checkOtp.user_Id,
                    user_Phone: bodyData.user_Phone,
                    purpose: 'reset_password'
                },
                'apiservice',
                { expiresIn: '10m' }
            );
        }

        // If existing user → normal success flow
        response['status'] = 'success';
        response['msg'] = 'OTP verified successfully. Login successful.';
        response['data'] = {
            isNewUser: false,
            user_Id: checkOtp?.user_Id,
            reset_token: resetToken
        };
        return utility.apiResponse(req, res, response);

    } catch (error) {
        throw error;
    }
};
exports.registerUser = async (req, res) => {
    try {
        let response = { status: 'error', msg: '' };
        let bodyData = req?.body?.inputdata;

        if (!bodyData?.user_Name) {
            response.msg = "Name is required";
            return utility.apiResponse(req, res, response);
        }

        if (!bodyData?.user_Phone) {
            response.msg = "Phone is required";
            return utility.apiResponse(req, res, response);
        }

        let condition = mysql.format('WHERE user_Phone = ?', [bodyData.user_Phone]);
        const existingUser = await dbQuery.fetchSingleRecord(
            constants.vals.defaultDB,
            'user',
            condition,
            'user_Id'
        );

        if (existingUser && existingUser.user_Id) {
            response.msg = "User already exists";
            return utility.apiResponse(req, res, response);
        }

        // ✅ Create user
        const userToken = jwt.sign(
            { phone: bodyData.user_Phone },
            'apiservice'
        );

        const params = {
            user_Name: bodyData.user_Name,
            user_Phone: bodyData.user_Phone,
            user_Pin: bodyData.user_Pin || '',
            user_Token: userToken,
            is_active: 1,
            is_delete: 0,
            created_at: req.locals.now
        };

        const insertUser = await dbQuery.insertSingle(
            constants.vals.defaultDB,
            'user',
            params
        );

        if (!insertUser || insertUser.insertId == null) {
            response.msg = 'Registration failed';
            return utility.apiResponse(req, res, response);
        }

        response.status = 'success';
        response.msg = 'User registered successfully';
        response.data = {
            user_Id: insertUser?.insertId ?? null,
            token: userToken
        };

        return utility.apiResponse(req, res, response);
        

    } catch (error) {
        throw error;
    }
};
exports.userLogin = async (req, res) => {
    try {
        let response = { status: 'error', msg: '' };
        let bodyData = req?.body?.inputdata;

        if (!bodyData?.user_Phone) {
            response.msg = "Phone is required";
            return utility.apiResponse(req, res, response);
        }

        if (!bodyData?.user_Pin) {
            response.msg = "PIN is required";
            return utility.apiResponse(req, res, response);
        }

        // ✅ Check user
        let condition = `WHERE user_Phone = '${bodyData.user_Phone}' AND is_active = 1 AND is_delete = 0`;
        const user = await dbQuery.fetchSingleRecord(
            constants.vals.defaultDB,
            'user',
            condition,
            'user_Id, user_Name, user_Phone, user_Pin'
        );

        if (!user || !user.user_Id) {
            response.msg = "User not found";
            return utility.apiResponse(req, res, response);
        }

        // ✅ Check PIN
        if (user.user_Pin !== bodyData.user_Pin) {
            response.msg = "Invalid PIN";
            return utility.apiResponse(req, res, response);
        }

        // ✅ Generate token
        const token = jwt.sign(
            { user_Id: user.user_Id, phone: user.user_Phone },
            'apiservice'
        );

        // ✅ Save token in DB
        const newValue = `user_Token = '${token}', updated_at = '${req.locals.now}'`;
        const updateCondition = `user_Id = ${user.user_Id}`;

        await dbQuery.updateRecord(
            constants.vals.defaultDB,
            'user',
            updateCondition,
            newValue
        );

        response.status = 'success';
        response.msg = 'Login successful';
        response.data = {
            user_Id: user.user_Id,
            token: token
        };

        return utility.apiResponse(req, res, response);

    } catch (error) {
        throw error;
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        let response = { status: 'error', msg: '' };
        let bodyData = req?.body?.inputdata;

        if (utility.checkEmptyString(bodyData?.user_Phone)) {
            response.msg = 'Phone is required';
            return utility.apiResponse(req, res, response);
        }

        const condition = mysql.format(
            "WHERE user_Phone = ? AND is_active = 1 AND is_delete = 0",
            [bodyData.user_Phone]
        );

        const user = await dbQuery.fetchSingleRecord(
            constants.vals.defaultDB,
            'user',
            condition,
            'user_Id, user_Phone'
        );

        if (!user || !user.user_Id) {
            response.msg = 'User not found';
            return utility.apiResponse(req, res, response);
        }

        const otp = await utility.generateOtp(constants.vals.optLength);
        const hashedOtp = await bcrypt.hash(otp, 10);
        const date = req.locals.now;
        const localNow = moment.tz(date, 'YYYY-MM-DD HH:mm:ss', constants.vals.tz);
        const expiresAt = localNow.clone().add(constants.vals.otpExpireMinutes, 'minutes').format('YYYY-MM-DD HH:mm:ss');

        const deleteCondition = mysql.format("user_phone = ?", [bodyData.user_Phone]);
        await dbQuery.deleteRecord(constants.vals.defaultDB, 'user_otp', deleteCondition);

        const otpParams = {
            user_id: user.user_Id,
            user_phone: bodyData.user_Phone,
            otp_hash: hashedOtp,
            expires_at: expiresAt,
            created_at: date
        };
        await dbQuery.insertSingle(constants.vals.defaultDB, 'user_otp', otpParams);

        try {
            await utility.sendSMS(bodyData.user_Phone, otp);
        } catch (err) {
            response.msg = err?.message || 'Failed to send OTP';
            return utility.apiResponse(req, res, response);
        }

        response.status = 'success';
        response.msg = 'OTP sent successfully';
        if (process.env.NODE_ENV !== 'production') {
            response.data = { dev_otp: otp };
        }
        return utility.apiResponse(req, res, response);
    } catch (error) {
        throw error;
    }
};

exports.resetPassword = async (req, res) => {
    try {
        let response = { status: 'error', msg: '' };
        let bodyData = req?.body?.inputdata;

        if (utility.checkEmptyString(bodyData?.user_Phone)) {
            response.msg = 'Phone is required';
            return utility.apiResponse(req, res, response);
        }

        if (utility.checkEmptyString(bodyData?.new_Pin)) {
            response.msg = 'New PIN is required';
            return utility.apiResponse(req, res, response);
        }

        const resetToken = bodyData?.reset_token;

        if (utility.checkEmptyString(resetToken)) {
            response.msg = 'Reset token is required';
            return utility.apiResponse(req, res, response);
        }

        let tokenData;
        try {
            tokenData = jwt.verify(resetToken, 'apiservice');
        } catch (err) {
            response.msg = 'Invalid or expired reset token';
            return utility.apiResponse(req, res, response);
        }

        if (
            tokenData?.purpose !== 'reset_password' ||
            tokenData?.user_Phone !== bodyData.user_Phone
        ) {
            response.msg = 'Invalid reset token payload';
            return utility.apiResponse(req, res, response);
        }

        const condition = mysql.format(
            "WHERE user_Id = ? AND user_Phone = ? AND is_active = 1 AND is_delete = 0",
            [tokenData.user_Id, bodyData.user_Phone]
        );

        const user = await dbQuery.fetchSingleRecord(
            constants.vals.defaultDB,
            'user',
            condition,
            'user_Id'
        );

        if (!user || !user.user_Id) {
            response.msg = 'User not found';
            return utility.apiResponse(req, res, response);
        }

        const newValue = mysql.format(
            "user_Pin = ?, updated_at = ?",
            [bodyData.new_Pin, req.locals.now]
        );
        const updateCondition = mysql.format("user_Id = ?", [user.user_Id]);

        await dbQuery.updateRecord(
            constants.vals.defaultDB,
            'user',
            updateCondition,
            newValue
        );

        response.status = 'success';
        response.msg = 'Password reset successful';
        return utility.apiResponse(req, res, response);
    } catch (error) {
        throw error;
    }
};

exports.changePassword = async (req, res) => {
    try {
        let response = { status: 'error', msg: '' };
        let bodyData = req?.body?.inputdata;

        if (utility.checkEmptyString(bodyData?.user_Id)) {
            response.msg = 'User ID is required';
            return utility.apiResponse(req, res, response);
        }

        if (utility.checkEmptyString(bodyData?.old_Pin)) {
            response.msg = 'Old PIN is required';
            return utility.apiResponse(req, res, response);
        }

        if (utility.checkEmptyString(bodyData?.new_Pin)) {
            response.msg = 'New PIN is required';
            return utility.apiResponse(req, res, response);
        }

        const condition = mysql.format(
            "WHERE user_Id = ? AND is_active = 1 AND is_delete = 0",
            [bodyData.user_Id]
        );

        const user = await dbQuery.fetchSingleRecord(
            constants.vals.defaultDB,
            'user',
            condition,
            'user_Id, user_Pin'
        );

        if (!user || !user.user_Id) {
            response.msg = 'User not found';
            return utility.apiResponse(req, res, response);
        }

        if (user.user_Pin !== bodyData.old_Pin) {
            response.msg = 'Old PIN is incorrect';
            return utility.apiResponse(req, res, response);
        }

        const newValue = mysql.format(
            "user_Pin = ?, updated_at = ?",
            [bodyData.new_Pin, req.locals.now]
        );
        const updateCondition = mysql.format("user_Id = ?", [user.user_Id]);

        await dbQuery.updateRecord(
            constants.vals.defaultDB,
            'user',
            updateCondition,
            newValue
        );

        response.status = 'success';
        response.msg = 'Password changed successfully';
        return utility.apiResponse(req, res, response);
    } catch (error) {
        throw error;
    }
};
exports.editProfile = async (req, res) => {
  try {
    let response = { status: "error", msg: "" };
    let bodyData = req?.body?.inputdata;

    const user_Id = bodyData?.user_Id;
    const first_name = bodyData?.first_name;
    const last_name = bodyData?.last_name;
    const email = bodyData?.email;
    const mobile = bodyData?.mobile;

    // validations
    if (utility.checkEmptyString(user_Id)) {
      response.msg = "User ID is required";
      return utility.apiResponse(req, res, response);
    }

    if (!first_name || !last_name || !email || !mobile) {
      response.msg = "All fields are required";
      return utility.apiResponse(req, res, response);
    }

    // check user exists
    const condition = `WHERE user_Id = ${user_Id} AND is_active = 1 AND is_delete = 0`;

    const user = await dbQuery.fetchSingleRecord(
      constants.vals.defaultDB,
      "user",
      condition,
      "user_Id"
    );

    if (!user || !user.user_Id) {
      response.msg = "User not found";
      return utility.apiResponse(req, res, response);
    }

    // update query
    const newValue = `
      user_Name = '${first_name} ${last_name}',
      email = '${email}',
      mobile = '${mobile}',
      updated_at = '${req.locals.now}'
    `;

    const updateCondition = `user_Id = ${user_Id}`;

    await dbQuery.updateRecord(
      constants.vals.defaultDB,
      "user",
      updateCondition,
      newValue
    );

    response.status = "success";
    response.msg = "Profile updated successfully";

    return utility.apiResponse(req, res, response);

  } catch (error) {
    console.error("editProfile error:", error);
    throw error;
  }
};