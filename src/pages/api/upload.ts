import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { fileUrl, type } = req.body || {} as { fileUrl?: string; type?: 'image' | 'document' };
  if (!fileUrl || typeof fileUrl !== 'string') {
    return res.status(400).json({ error: 'fileUrl is required' });
  }

  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined;
  if (!cloudName && process.env.CLOUDINARY_URL) {
    try {
      // CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
      const url = process.env.CLOUDINARY_URL;
      const match = url?.match(/@([^\s/?#]+)/);
      if (match && match[1]) cloudName = match[1];
    } catch { }
  }
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    return res.status(500).json({ error: 'Cloudinary is not configured' });
  }

  try {
    const form = new FormData();
    form.append('file', fileUrl);
    form.append('upload_preset', uploadPreset);
    form.append('folder', `chat-uploads/${userId}`);
    // Let Cloudinary auto-detect resource type

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: 'POST',
      body: form as any,
    });
    const data = await uploadRes.json();
    if (!uploadRes.ok) {
      console.error('Cloudinary upload failed:', data);
      return res.status(500).json({ error: data?.error?.message || 'Cloudinary upload failed', details: data });
    }

    return res.status(200).json({
      url: data.secure_url,
      public_id: data.public_id,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
      format: data.format,
      resource_type: data.resource_type,
      original_filename: data.original_filename,
      type: type || 'document',
    });
  } catch (e: any) {
    console.error('Upload API error:', e);
    return res.status(500).json({ error: e?.message || 'Upload failed' });
  }
}


