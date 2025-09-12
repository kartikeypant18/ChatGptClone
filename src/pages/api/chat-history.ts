// src/pages/api/chat-history.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongo";
import { getAuth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";

const dbName = process.env.MONGODB_DB || "chatgpt-clone";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const chats = db.collection("chats");
    const threads = db.collection("threads");

    // Ensure indexes (idempotent)
    await chats.createIndex({ user: 1, threadId: 1, createdAt: 1 });

    if (req.method === "GET") {
      const { threadId, limit } = req.query as { threadId?: string; limit?: string };
      const query: any = { user: userId };
      if (threadId) query.threadId = threadId;
      const max = Math.min(Number(limit) || 100, 200);
      const raw = await chats
        .find(query)
        .sort({ createdAt: 1 })
        .limit(max)
        .toArray();
      const userChats = raw.map((d: any) => ({ ...d, _id: String(d._id) }));
      return res.status(200).json(userChats);
    }

    if (req.method === "POST") {
      const { content, role, threadId, model, turnId } = req.body || {};
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "content is required" });
      }
      if (role !== "user" && role !== "assistant") {
        return res.status(400).json({ error: "role must be 'user' or 'assistant'" });
      }
      if (!threadId || typeof threadId !== "string") {
        return res.status(400).json({ error: "threadId is required" });
      }

      // Ensure the thread exists and belongs to user
      if (!ObjectId.isValid(threadId)) {
        return res.status(400).json({ error: "Invalid threadId" });
      }
      const thread = await threads.findOne({ _id: new ObjectId(threadId), user: userId });
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Turn-based storage: one document per user+assistant pair
      if (role === 'user') {
        const now = new Date();
        const turnDoc = {
          user: userId,
          threadId,
          userContent: content,
          assistantContent: null as string | null,
          // versioning
          versions: [
            { userContent: content, assistantContent: null, createdAt: now },
          ],
          currentVersion: 0,
          model: model || null,
          createdAt: now,
          updatedAt: now,
        };
        const result = await chats.insertOne(turnDoc);
        const update: any = { updatedAt: now };
        if ((!thread.title || thread.title === 'New conversation') && typeof content === 'string') {
          update.title = content.slice(0, 60);
        }
        await threads.updateOne({ _id: thread._id }, { $set: update });
        return res.status(201).json({ _id: result.insertedId.toHexString(), ...turnDoc });
      }

      // role === 'assistant' must update existing turn
      if (!turnId) {
        return res.status(400).json({ error: "turnId is required for assistant replies" });
      }
      if (!ObjectId.isValid(turnId)) {
        return res.status(400).json({ error: "Invalid turnId" });
      }
      const oid = new ObjectId(turnId);
      const doc = await chats.findOne({ _id: oid, user: userId, threadId });
      if (!doc) return res.status(404).json({ error: 'Turn not found' });
      const versionIndex = typeof doc.currentVersion === 'number' ? doc.currentVersion : 0;
      const result = await chats.updateOne(
        { _id: oid },
        { $set: { assistantContent: content, model: model || null, updatedAt: new Date(), [`versions.${versionIndex}.assistantContent`]: content } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Turn not found' });
      }
      await threads.updateOne({ _id: thread._id }, { $set: { updatedAt: new Date() } });
      return res.status(200).json({ _id: turnId, ok: true });
    }

    if (req.method === "PATCH") {
      const { turnId, threadId, content } = req.body || {};
      if (!turnId || !threadId || typeof content !== 'string') {
        return res.status(400).json({ error: "turnId, threadId and content are required" });
      }
      if (!ObjectId.isValid(turnId) || !ObjectId.isValid(threadId)) {
        return res.status(400).json({ error: "Invalid id(s)" });
      }
      const thread = await threads.findOne({ _id: new ObjectId(threadId), user: userId });
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const doc = await chats.findOne({ _id: new ObjectId(turnId), user: userId, threadId });
      if (!doc) return res.status(404).json({ error: "Turn not found" });
      const newIndex = Array.isArray(doc.versions) ? doc.versions.length : 0;
      const update: any = {
        $set: {
          userContent: content,
          assistantContent: null,
          currentVersion: newIndex,
          updatedAt: new Date(),
        },
        $push: {
          versions: { userContent: content, assistantContent: null, createdAt: new Date() },
        },
      };
      const result = await chats.updateOne(
        { _id: new ObjectId(turnId) },
        update as any
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: "Turn not found" });
      await threads.updateOne({ _id: thread._id }, { $set: { updatedAt: new Date(), title: thread.title || content.slice(0, 60) } });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "PUT") {
      // Set currentVersion
      const { turnId, threadId, version } = req.body || {};
      if (!turnId || !threadId || typeof version !== 'number') {
        return res.status(400).json({ error: "turnId, threadId and numeric version are required" });
      }
      if (!ObjectId.isValid(turnId) || !ObjectId.isValid(threadId)) {
        return res.status(400).json({ error: "Invalid id(s)" });
      }
      const doc = await chats.findOne({ _id: new ObjectId(turnId), user: userId, threadId });
      if (!doc) return res.status(404).json({ error: "Turn not found" });
      const total = Array.isArray(doc.versions) ? doc.versions.length : 0;
      if (version < 0 || version >= total) return res.status(400).json({ error: "Version out of range" });
      await chats.updateOne({ _id: new ObjectId(turnId) }, { $set: { currentVersion: version, updatedAt: new Date(), userContent: doc.versions[version].userContent, assistantContent: doc.versions[version].assistantContent || null } });
      await threads.updateOne({ _id: new ObjectId(threadId) }, { $set: { updatedAt: new Date() } });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
