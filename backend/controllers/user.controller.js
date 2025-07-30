import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// S3 configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword
    });

    return res.status(201).json({
      success: true,
      message: "Account Created Successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to register"
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email && !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Incorrect email or password"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid Credentials"
      });
    }

    const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });
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
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to login"
    });
  }
};

export const logout = async (_, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully.",
      success: true
    });
  } catch (error) {
    console.error(error);
  }
};

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
      return res.status(404).json({
        message: "User not found",
        success: false
      });
    }

    // Upload file to S3 if present
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

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      user
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.status(200).json({
      success: true,
      message: "User list fetched successfully",
      total: users.length,
      users
    });
  } catch (error) {
    console.error("Error fetching user list:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
};
