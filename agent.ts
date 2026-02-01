import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-2.5-flash", // fast + cheap
});
console.log("Gemini key:", process.env.GOOGLE_API_KEY);

export async function runAgent(text: string): Promise<string> {
  const res = await model.invoke(text);
  return res.content as string;
}
