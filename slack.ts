import { App } from "@slack/bolt";
import dotenv from "dotenv";
import { runAgent } from "./agent";

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  socketMode: false
});

/*
  🔥 IMPORTANT: this handles Slack verification automatically
*/
app.event("app_mention", async ({ event, say }) => {
  const reply = await runAgent(event.text);
  await say(reply);
});
app.event("message", async ({ event, say }) => {
  console.log("🔥 MESSAGE EVENT:", event);

  const text = (event as any).text;
  if (!text) return;

  const reply = await runAgent(text);
  await say(reply);
});



(async () => {
  await app.start(3000);
  console.log("⚡ Slack agent running on port 3000");
})();
