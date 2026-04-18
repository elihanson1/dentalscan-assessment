import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { images } = body;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const scan = await prisma.scan.create({
      data: {
        status: "completed",
        images: images.join(","),
      },
    });

    void fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId: scan.id, status: "completed" }),
    }).catch((err) => console.error("[/api/scans/upload] Webhook dispatch failed:", err));

    return NextResponse.json({ ok: true, scanId: scan.id }, { status: 201 });
  } catch (err) {
    console.error("[/api/scans/upload] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
