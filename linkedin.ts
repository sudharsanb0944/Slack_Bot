import axios from "axios";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// LinkedIn API configuration
const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

/**
 * Get LinkedIn access token using OAuth 2.0
 * Note: In production, you should implement proper OAuth flow
 * For now, we'll use a stored access token from environment variables
 */
async function getLinkedInAccessToken(): Promise<string> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("LINKEDIN_ACCESS_TOKEN not found in environment variables");
  }
  return accessToken;
}

/**
 * Get the authenticated user's LinkedIn profile ID
 */
async function getLinkedInPersonId(): Promise<string> {
  const personId = process.env.LINKEDIN_PERSON_ID;
  if (!personId) {
    throw new Error("LINKEDIN_PERSON_ID not found in environment variables. Please set your LinkedIn user ID.");
  }
  return personId;
}

/**
 * Post content to LinkedIn
 */
async function postToLinkedIn(text: string, visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC"): Promise<string> {
  try {
    const accessToken = await getLinkedInAccessToken();
    const personId = await getLinkedInPersonId();

    // LinkedIn API endpoint for creating a post (UGC Posts API)
    const url = `${LINKEDIN_API_BASE}/ugcPosts`;

    const postData = {
      author: `urn:li:person:${personId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibility,
      },
    };

    const response = await axios.post(url, postData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (response.status === 201 || response.status === 200) {
      return `✅ LinkedIn post successfully published! Post ID: ${response.data.id || "N/A"}`;
    } else {
      return `⚠️ LinkedIn API returned status ${response.status}`;
    }
  } catch (error: any) {
    if (error.response) {
      return `❌ Failed to post to LinkedIn: ${error.response.data?.message || error.response.statusText} (Status: ${error.response.status})`;
    }
    return `❌ Failed to post to LinkedIn: ${error.message}`;
  }
}

/**
 * LangChain LinkedIn Post Generator and Publisher Tool
 * This tool generates a LinkedIn post using AI and posts it to LinkedIn
 */
export const linkedInPostTool = tool(
  async ({ topic, tone, includeHashtags, visibility }) => {
    try {
      // Import the model to generate post content
      const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
      
      const model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY!,
        model: "gemini-2.5-flash",
      });

      // Generate LinkedIn post content
      const prompt = `Generate a professional LinkedIn post about: "${topic}".
${tone ? `Write it in a ${tone} tone.` : "Write it in a professional yet engaging tone."}
${includeHashtags ? "Include 3-5 relevant hashtags at the end." : ""}
Make it engaging, valuable, and appropriate for LinkedIn. Keep it between 150-300 words.
Return only the post content, no additional text.`;

      const { HumanMessage } = await import("@langchain/core/messages");
      const response = await model.invoke([new HumanMessage(prompt)]);
      const generatedPost = response.content as string;

      // Post to LinkedIn
      const postResult = await postToLinkedIn(generatedPost, visibility);

      return `${postResult}\n\n📝 Generated Post:\n${generatedPost}`;
    } catch (error: any) {
      return `❌ Error generating or posting to LinkedIn: ${error.message}`;
    }
  },
  {
    name: "create_linkedin_post",
    description:
      "Generate and post a LinkedIn post. Provide a topic, optional tone, and visibility settings. The AI will generate engaging content and automatically post it to LinkedIn.",
    schema: z.object({
      topic: z.string().describe("The topic or subject for the LinkedIn post"),
      tone: z
        .enum(["professional", "casual", "inspiring", "informative", "conversational"])
        .optional()
        .describe("The tone of the post (default: professional)"),
      includeHashtags: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include hashtags in the post"),
      visibility: z
        .enum(["PUBLIC", "CONNECTIONS"])
        .optional()
        .default("PUBLIC")
        .describe("Post visibility: PUBLIC (everyone) or CONNECTIONS (only connections)"),
    }),
  }
);

/**
 * Direct LinkedIn Post Tool (posts provided text directly)
 */
export const linkedInDirectPostTool = tool(
  async ({ text, visibility }) => {
    try {
      const result = await postToLinkedIn(text, visibility);
      return `${result}\n\n📝 Posted Content:\n${text}`;
    } catch (error: any) {
      return `❌ Failed to post to LinkedIn: ${error.message}`;
    }
  },
  {
    name: "post_to_linkedin",
    description:
      "Post provided text directly to LinkedIn without AI generation. Use this when you have specific content to post.",
    schema: z.object({
      text: z.string().describe("The exact text content to post on LinkedIn"),
      visibility: z
        .enum(["PUBLIC", "CONNECTIONS"])
        .optional()
        .default("PUBLIC")
        .describe("Post visibility: PUBLIC (everyone) or CONNECTIONS (only connections)"),
    }),
  }
);
