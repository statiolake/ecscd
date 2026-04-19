import { NextRequest, NextResponse } from "next/server";
import { du } from "@/lib/di";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    if (!name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await du.rollbackApplication({ name });
    switch (result.type) {
      case "Succeeded":
        return NextResponse.json(
          { message: "Service rolled back successfully" },
          { status: 200 }
        );
      case "NotFound":
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      case "AwsFailure":
        return NextResponse.json(
          { error: result.reason },
          { status: 502 }
        );
    }
  } catch (error) {
    console.error("Error rolling back service:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to roll back service",
      },
      { status: 500 }
    );
  }
}
