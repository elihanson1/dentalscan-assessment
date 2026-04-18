import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function stubSmsDispatch(scanId: string) {
  console.log("[Twilio stub] POST https://api.twilio.com/2010-04-01/Accounts/.../Messages");
  console.log(`[Twilio stub] To: +1-clinic-oncall | Body: Scan ${scanId} is ready for review.`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scanId, status } = body;

    if (!scanId || typeof scanId !== "string") {
      return NextResponse.json({ error: "Missing scanId" }, { status: 400 });
    }

    if (status !== "completed") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    await prisma.notification.create({
      data: {
        scanId,
        userId: "clinic-001",
        title: "Scan Completed",
        message: `Patient scan ${scanId} has been submitted and is ready for review.`,
        read: false,
      },
    });

    void stubSmsDispatch(scanId);

    return NextResponse.json({ ok: true, message: "Notification created" });
  } catch (err) {
    console.error("[/api/notify] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: "clinic-001" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("[/api/notify] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
