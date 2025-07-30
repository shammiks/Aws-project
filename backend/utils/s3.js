// backend/utils/s3.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import path from "path";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const uploadFileToS3 = async (file) => {
  const fileExtension = path.extname(file.originalname);
  const fileKey = `${uuidv4()}${fileExtension}`;

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
};

const deleteFileFromS3 = async (fileKey) => {
  const deleteParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
  };

  await s3.send(new DeleteObjectCommand(deleteParams));
};

export { uploadFileToS3, deleteFileFromS3 };
