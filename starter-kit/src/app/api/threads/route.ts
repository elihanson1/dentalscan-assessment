import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { patientId } = await req.json();
    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json({ error: "Missing patientId" }, { status: 400 });
    }

    const thread = await prisma.thread.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
    });

    return NextResponse.json({ threadId: thread.id });
  } catch (err) {
    console.error("[/api/threads] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
