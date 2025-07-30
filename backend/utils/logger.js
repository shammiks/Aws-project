import winston from "winston";
import WinstonCloudWatch from "winston-cloudwatch";

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new WinstonCloudWatch({
      logGroupName: "BlogApp-Logs", // Name of your log group
      logStreamName: "AppStream",   // Name of the stream inside that group
      awsRegion: process.env.AWS_REGION,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }),
    new winston.transports.Console()
  ],
});

export default logger;
