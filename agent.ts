import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-2.5-flash", // fast + cheap
});
console.log("Gemini key:", process.env.GOOGLE_API_KEY);

// history of messages between user and agent for context keeping in memory.
const history: (HumanMessage | AIMessage)[] = [];
//------------------------------------------------------
// tool for getting correct calcualtions of numbers
const calculator = tool(
    async ({ expression }) => {
      try {
        const result = eval(expression);
        return `Result: ${result}`;
      } catch {
        return "Invalid math expression";
      }
    },
    {
      name: "calculator",
      description: "Solve math expressions like 25*17 or 10/2+5",
      schema: z.object({
        expression: z.string(),
      }),
    }
  );
  //------------------------------------------------------
// tool for getting current time
const timeTool = tool(
  async () => {
    return `Current time: ${new Date().toLocaleString()}`;
  },
  {
    name: "time",
    description: "  Get current Date and time",
    schema: z.object({}),
  }
);

const echoTool = tool(
    async ({ text }) => `Echo: ${text}`,
    {
      name: "echo",
      description: "Repeat the given text",
      schema: z.object({
        text: z.string(),
      }),
    }
  );

  // register tools
const tools = [calculator, timeTool, echoTool];

// bind tools to model
const llmWithTools = model.bindTools(tools);



export async function runAgent(text: string): Promise<string> {
  // add user message
  history.push(new HumanMessage(text));

  // call model with full history
  const res = await model.invoke(history);

  const reply = res.content as string;

  // add AI reply to history
  history.push(new AIMessage(reply));

  return reply;
}
