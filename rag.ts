import fs from "fs";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";


const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY!,
});

let vectorStore: Chroma;

export async function loadDocument(path: string) {
  const text = fs.readFileSync(path, "utf-8");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });

  const docs = await splitter.createDocuments([text]);

  vectorStore = await Chroma.fromDocuments(docs, embeddings, {
    collectionName: "docs",
    url: "http://localhost:8000",
  });

  console.log("✅ Stored in Chroma DB");
}

export async function searchDocs(query: string) {
  const results = await vectorStore.similaritySearch(query, 3);
  return results.map(r => r.pageContent).join("\n\n");
}