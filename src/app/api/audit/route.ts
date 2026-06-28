import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/auditor";
import { AuditRequest } from "@/lib/types";

export const maxDuration = 30; // Allow up to 30s for endpoint checks

export async function POST(req: NextRequest) {
  try {
    const body: AuditRequest = await req.json();

    if (!body.registrationJson || body.registrationJson.trim().length === 0) {
      return NextResponse.json(
        { error: "Registration JSON is required" },
        { status: 400 }
      );
    }

    // Basic wallet address validation
    let wallet = body.walletAddress?.trim();
    if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format — must be 0x + 40 hex chars" },
        { status: 400 }
      );
    }

    const result = await runAudit(body.registrationJson, wallet || undefined);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
