/**
 * LinkedIn Post Generator and Publisher
 * 
 * SETUP REQUIRED:
 * 1. Create a LinkedIn app at https://www.linkedin.com/developers/apps
 * 2. Get OAuth access token with 'w_member_social' scope
 * 3. Get your Person ID from LinkedIn API
 * 4. Add to .env file:
 *    LINKEDIN_ACCESS_TOKEN=your_access_token
 *    LINKEDIN_PERSON_ID=your_person_id
 * 
 * USAGE:
 * - generate_linkedin_post: Generate a post without posting
 * - post_to_linkedin: Post existing content to LinkedIn
 * - generate_and_post_linkedin: Generate and post in one step
 */

import axios from "axios";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Initialize LLM for post generation
const postGenerator = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-2.5-flash",
});

/**
 * Generate a LinkedIn post using AI based on topic and tone
 */
export async function generateLinkedInPost(
  topic: string,
  tone: string = "professional",
  length: string = "medium"
): Promise<string> {
  const lengthGuide: Record<string, string> = {
    short: "Keep it under 150 words, concise and impactful",
    medium: "Write 200-300 words, balanced and engaging",
    long: "Write 400-500 words, detailed and comprehensive",
  };

  const prompt = `Create a professional LinkedIn post about: "${topic}"

Requirements:
- Tone: ${tone}
- Length: ${lengthGuide[length] || lengthGuide.medium}
- Include relevant hashtags (3-5 hashtags)
- Make it engaging and valuable for LinkedIn audience
- Start with a hook to grab attention
- End with a call-to-action or question to encourage engagement
- Format it properly with line breaks for readability

Post content:`;

  try {
    const response = await postGenerator.invoke(prompt);
    return response.content as string;
  } catch (error: any) {
    throw new Error(`Failed to generate post: ${error.message}`);
  }
}

/**
 * Post content to LinkedIn using LinkedIn API v2
 */
export async function postToLinkedIn(
  text: string,
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC"
): Promise<string> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personId = process.env.LINKEDIN_PERSON_ID;

  if (!accessToken) {
    throw new Error("LINKEDIN_ACCESS_TOKEN environment variable is not set");
  }

  if (!personId) {
    throw new Error("LINKEDIN_PERSON_ID environment variable is not set");
  }

  // Construct the person URN from the person ID
  const personUrn = `urn:li:person:${personId}`;

  try {
    // LinkedIn API v2 endpoint for creating posts
    const apiUrl = "https://api.linkedin.com/v2/ugcPosts";

    // Prepare the post payload
    const postData = {
      author: personUrn,
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

    const response = await axios.post(apiUrl, postData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    const postId = response.data.id;
    return `✅ LinkedIn post published successfully! Post ID: ${postId}\nView it at: https://www.linkedin.com/feed/update/${postId}`;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `LinkedIn API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    }
    throw new Error(`Failed to post to LinkedIn: ${error.message}`);
  }
}

/**
 * LangChain tool for generating LinkedIn posts
 */
export const generateLinkedInPostTool = tool(
  async ({ topic, tone, length }) => {
    try {
      const post = await generateLinkedInPost(topic, tone, length);
      return `Generated LinkedIn post:\n\n${post}\n\n---\nNote: This is a preview. Use the post_to_linkedin tool to publish it.`;
    } catch (error: any) {
      return `❌ Failed to generate post: ${error.message}`;
    }
  },
  {
    name: "generate_linkedin_post",
    description:
      "Generate a professional LinkedIn post about a given topic. Specify the topic, tone (professional, casual, inspirational, etc.), and length (short, medium, long). Returns the generated post content.",
    schema: z.object({
      topic: z.string().describe("The topic or subject for the LinkedIn post"),
      tone: z
        .string()
        .optional()
        .describe("Tone of the post: professional, casual, inspirational, friendly, etc. Default: professional"),
      length: z
        .string()
        .optional()
        .describe("Length of the post: short (under 150 words), medium (200-300 words), or long (400-500 words). Default: medium"),
    }),
  }
);

/**
 * LangChain tool for posting to LinkedIn
 */
export const postToLinkedInTool = tool(
  async ({ text, visibility }) => {
    try {
      const result = await postToLinkedIn(text, visibility);
      return result;
    } catch (error: any) {
      return `❌ Failed to post to LinkedIn: ${error.message}`;
    }
  },
  {
    name: "post_to_linkedin",
    description:
      "Post content directly to LinkedIn. Provide the post text and optionally set visibility (PUBLIC or CONNECTIONS). Requires LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_ID environment variables.",
    schema: z.object({
      text: z.string().describe("The full text content of the LinkedIn post to publish"),
      visibility: z
        .enum(["PUBLIC", "CONNECTIONS"])
        .optional()
        .describe("Post visibility: PUBLIC (everyone) or CONNECTIONS (only connections). Default: PUBLIC"),
    }),
  }
);

/**
 * Combined tool that generates and posts in one step
 */
export const generateAndPostLinkedInTool = tool(
  async ({ topic, tone, length, visibility, autoPost }) => {
    try {
      // Generate the post
      const post = await generateLinkedInPost(topic, tone, length);
      
      if (autoPost === true || autoPost === "true") {
        // Post to LinkedIn
        const result = await postToLinkedIn(post, visibility);
        return `${result}\n\nGenerated post content:\n${post}`;
      } else {
        // Return generated post without posting
        return `Generated LinkedIn post:\n\n${post}\n\n---\nNote: Set autoPost=true to automatically publish this post.`;
      }
    } catch (error: any) {
      return `❌ Failed to generate/post: ${error.message}`;
    }
  },
  {
    name: "generate_and_post_linkedin",
    description:
      "Generate a LinkedIn post about a topic and optionally post it automatically. If autoPost is true, the post will be published immediately. Otherwise, it returns the generated post for review.",
    schema: z.object({
      topic: z.string().describe("The topic or subject for the LinkedIn post"),
      tone: z
        .string()
        .optional()
        .describe("Tone of the post: professional, casual, inspirational, friendly, etc. Default: professional"),
      length: z
        .string()
        .optional()
        .describe("Length of the post: short, medium, or long. Default: medium"),
      visibility: z
        .enum(["PUBLIC", "CONNECTIONS"])
        .optional()
        .describe("Post visibility if autoPost is true: PUBLIC or CONNECTIONS. Default: PUBLIC"),
      autoPost: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe("Whether to automatically post to LinkedIn. Set to true or 'true' to publish immediately. Default: false"),
    }),
  }
);
