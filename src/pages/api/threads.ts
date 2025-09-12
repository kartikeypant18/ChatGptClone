import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongo";
import { getAuth } from "@clerk/nextjs/server";

const dbName = process.env.MONGODB_DB || "chatgpt-clone";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const threads = db.collection("threads");
    const chats = db.collection("chats");

    await threads.createIndex({ user: 1, updatedAt: -1 });

    if (req.method === "GET") {
      // Return threads with last message preview
      const raw = await threads
        .find({ user: userId })
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      const list = raw.map((t: any) => ({ ...t, _id: String(t._id) }));
      return res.status(200).json(list);
    }

    if (req.method === "POST") {
      const { title } = req.body || {};
      const now = new Date();
      const doc = { user: userId, title: title || "New conversation", createdAt: now, updatedAt: now };
      const result = await threads.insertOne(doc);
      return res.status(201).json({ _id: result.insertedId.toHexString(), ...doc });
    }

    if (req.method === "PATCH") {
      const { threadId, title } = req.body || {};
      if (!threadId || typeof title !== "string") return res.status(400).json({ error: "threadId and title required" });
      const { ObjectId } = require("mongodb");
      if (!ObjectId.isValid(threadId)) return res.status(400).json({ error: "Invalid threadId" });
      const result = await threads.updateOne({ _id: new ObjectId(threadId), user: userId }, { $set: { title, updatedAt: new Date() } });
      if (result.matchedCount === 0) return res.status(404).json({ error: "Thread not found" });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { threadId } = req.body || {};
      if (!threadId) return res.status(400).json({ error: "threadId required" });
      const { ObjectId } = require("mongodb");
      if (!ObjectId.isValid(threadId)) return res.status(400).json({ error: "Invalid threadId" });
      const oid = new ObjectId(threadId);
      await threads.deleteOne({ _id: oid, user: userId });
      await chats.deleteMany({ threadId: threadId, user: userId });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}

