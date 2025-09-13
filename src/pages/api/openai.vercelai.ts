import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { getAuth } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages } = req.body as any;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Invalid messages format." });
    return;
  }

  try {
    const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");
    const { text } = await generateText({
      model: google("models/gemini-2.0-flash-exp"),
      prompt,
    });
    res.status(200).json({ message: text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get response from Gemini." });
  }
}
