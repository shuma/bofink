import { NextResponse } from "next/server";
import { getInsurelyClient } from "@/lib/insurely/client";

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const client = getInsurelyClient();
    const status = await client.getCollectionStatus(sessionId);

    // If completed, also fetch the data
    if (status.status === "COMPLETED" || status.status === "COMPLETED_PARTIAL") {
      const data = await client.getCollectionData(sessionId);
      return NextResponse.json({
        ...status,
        loans: data.loans,
      });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting collection status:", error);

    if (error instanceof Error && error.message.includes("INSURELY_API_KEY")) {
      return NextResponse.json(
        { error: "Insurely is not configured", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get collection status" },
      { status: 500 }
    );
  }
}
