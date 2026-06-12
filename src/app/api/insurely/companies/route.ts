import { NextResponse } from "next/server";
import { getInsurelyClient } from "@/lib/insurely/client";

export async function GET() {
  try {
    const client = getInsurelyClient();
    const companies = await client.getCompanies();

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Error fetching companies:", error);

    // Check if it's a configuration error
    if (error instanceof Error && error.message.includes("INSURELY_API_KEY")) {
      return NextResponse.json(
        { error: "Insurely is not configured", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}
