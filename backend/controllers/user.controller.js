import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import dotenv from "dotenv";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import logger from "../utils/logger.js";

dotenv.config();

// S3 configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

// Register
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      logger.warn("Register attempt with missing fields", { email });
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      logger.warn("Invalid email format during registration", { email });
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    if (password.length < 6) {
      logger.warn("Password too short during registration", { email });
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn("Email already registered", { email });
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword
    });

    // ✅ Send SNS Welcome Message to Admin
    const sns = new SNSClient({ region: process.env.AWS_REGION });
    const snsMessage = `
👤 New User Registration Alert!

A new user has just signed up on BlogApp.

📧 Email: ${newUser.email}
🧑 Name: ${newUser.firstName} ${newUser.lastName}

Keep an eye on new activity and ensure a warm onboarding experience!

- BlogApp Admin Notification 🚨
    `;

    await sns.send(new PublishCommand({
      Message: snsMessage,
      TopicArn: process.env.SNS_TOPIC_ARN,
      Subject: "New User Registered on BlogApp"
    }));

    logger.info("User registered successfully", { email });

    return res.status(201).json({
      success: true,
      message: "Account Created Successfully"
    });

  } catch (error) {
    logger.error("Registration failed", { error: error.message });
    return res.status(500).json({ success: false, message: "Failed to register" });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn("Login attempt with missing fields");
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Login failed: user not found", { email });
      return res.status(400).json({ success: false, message: "Incorrect email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn("Login failed: invalid password", { email });
      return res.status(400).json({ success: false, message: "Invalid Credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

    logger.info("Login successful", { email });

    return res.status(200).cookie("token", token, {
      maxAge: 1 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict"
    }).json({
      success: true,
      message: `Welcome back ${user.firstName}`,
      user
    });

  } catch (error) {
    logger.error("Login failed", { error: error.message });
    return res.status(500).json({ success: false, message: "Failed to login" });
  }
};

// Logout
export const logout = async (_, res) => {
  try {
    logger.info("User logged out");
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully.",
      success: true
    });
  } catch (error) {
    logger.error("Logout failed", { error: error.message });
  }
};

// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.id;
    const {
      firstName, lastName, occupation, bio,
      instagram, facebook, linkedin, github
    } = req.body;

    const file = req.file;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      logger.warn("Profile update failed: user not found", { userId });
      return res.status(404).json({ message: "User not found", success: false });
    }

    if (file) {
      const fileExt = path.extname(file.originalname);
      const uniqueFileName = `avatars/${uuidv4()}${fileExt}`;
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };

      await s3.send(new PutObjectCommand(uploadParams));
      const s3Url = `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
      user.photoUrl = s3Url;
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (occupation) user.occupation = occupation;
    if (instagram) user.instagram = instagram;
    if (facebook) user.facebook = facebook;
    if (linkedin) user.linkedin = linkedin;
    if (github) user.github = github;
    if (bio) user.bio = bio;

    await user.save();

    logger.info("Profile updated", { userId });

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      user
    });

  } catch (error) {
    logger.error("Profile update failed", { error: error.message });
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

// Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    logger.info("Fetched all users", { count: users.length });

    return res.status(200).json({
      success: true,
      message: "User list fetched successfully",
      total: users.length,
      users
    });
  } catch (error) {
    logger.error("Fetching users failed", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
};
