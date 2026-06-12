import { NextResponse } from "next/server";
import { z } from "zod";
import { getInsurelyClient } from "@/lib/insurely/client";

// Validate Swedish personal number (YYYYMMDDXXXX or YYMMDDXXXX)
const personalNumberSchema = z.string().refine(
  (val) => {
    const digits = val.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 12;
  },
  { message: "Invalid personal number format" }
);

const initiateSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  personalNumber: personalNumberSchema,
  loginMethod: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = initiateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { companyId, personalNumber, loginMethod } = validation.data;

    const client = getInsurelyClient();
    const response = await client.initiateCollection(companyId, personalNumber, loginMethod);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error initiating collection:", error);

    if (error instanceof Error && error.message.includes("INSURELY_API_KEY")) {
      return NextResponse.json(
        { error: "Insurely is not configured", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to initiate collection", details: errorMessage },
      { status: 500 }
    );
  }
}
