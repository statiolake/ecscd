import { NextRequest, NextResponse } from "next/server";
import { au, du } from "@/lib/di";

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
    const application = await au.getApplication(name);
    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }
    const result = await du.syncApplication({ application });
    switch (result.type) {
      case "Succeeded":
        return NextResponse.json(
          { message: "Service synchronized successfully" },
          { status: 200 }
        );
      case "Failed":
        return NextResponse.json(
          { error: result.reason },
          { status: 500 }
        );
    }
  } catch (error) {
    console.error("Error synchronizing service:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to synchronize service",
      },
      { status: 500 }
    );
  }
}
