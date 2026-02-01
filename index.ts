import dotenv from "dotenv";
dotenv.config();
import "./slack";
console.log("Environment variables loaded");
console.log("GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY);
console.log("SLACK_BOT_TOKEN:", process.env.SLACK_BOT_TOKEN);
console.log("SLACK_SIGNING_SECRET:", process.env.SLACK_SIGNING_SECRET);