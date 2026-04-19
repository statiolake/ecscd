import { NextRequest, NextResponse } from "next/server";
import { fu } from "@/lib/di";

export async function GET() {
  try {
    const filters = await fu.getFilters();
    return NextResponse.json({ filters });
  } catch (error) {
    console.error("Error fetching filters:", error);
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, pattern } = body;

    if (typeof name !== "string" || typeof pattern !== "string") {
      return NextResponse.json(
        { error: "name and pattern are required strings" },
        { status: 400 }
      );
    }

    const result = await fu.createFilter({ name, pattern });
    switch (result.type) {
      case "Created":
        return NextResponse.json(
          { filter: result.filter },
          { status: 201 }
        );
      case "Invalid":
        return NextResponse.json(
          { error: "Validation failed", details: result.errors },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error creating filter:", error);
    return NextResponse.json(
      { error: "Failed to create filter" },
      { status: 500 }
    );
  }
}
