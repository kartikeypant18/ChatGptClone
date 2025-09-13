import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { getAuth } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false, // Required for streaming
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Read raw body for streaming
  let body = "";
  await new Promise((resolve) => {
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", resolve);
  });
  const { messages } = JSON.parse(body);
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Invalid messages format." });
    return;
  }

  try {
    const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");
    const result = await streamText({
      model: google("models/gemini-2.0-flash-exp"),
      prompt,
    });
    // If client requests streaming, stream the response
    if (req.query.stream === '1') {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      for await (const delta of result.textStream) {
        res.write(delta);
      }
      res.end();
      return;
    }
    // Default: old behavior (full response)
    let text = "";
    for await (const delta of result.textStream) {
      text += delta;
    }
    res.status(200).json({ message: text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get response from Gemini." });
  }
}
