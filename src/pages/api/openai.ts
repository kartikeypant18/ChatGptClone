import { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { getAuth } from "@clerk/nextjs/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Get your environment variables

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages, attachments } = req.body as any;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Invalid messages format." });
    return;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      // Use safer defaults by omitting or setting reasonable thresholds
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    // Build content parts including inline images if provided
    const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");
    const parts: any[] = [{ text: prompt }];
    if (Array.isArray(attachments)) {
      for (const a of attachments) {
        if (a?.type === 'image' && typeof a?.url === 'string') {
          parts.push({
            inline_data: {
              mime_type: 'image/*',
              data: Buffer.from(await (await fetch(a.url)).arrayBuffer()).toString('base64'),
            },
          });
        }
      }
    }

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const response = result.response;
    const text = response.text();

    res.status(200).json({ message: text });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to get response from Gemini." });
  }
}
