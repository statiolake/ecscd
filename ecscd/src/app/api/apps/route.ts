import { au } from "@/lib/di";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const namesOnly = searchParams.get("namesOnly") === "true";
    const filter = searchParams.get("filter");

    if (namesOnly) {
      let names = await au.getApplicationNames();

      if (filter && filter.trim()) {
        const filterLower = filter.toLowerCase();
        names = names.filter((name) =>
          name.toLowerCase().includes(filterLower),
        );
      }

      return NextResponse.json({ names });
    }

    let applications = await au.getApplications();

    if (filter && filter.trim()) {
      const filterLower = filter.toLowerCase();
      applications = applications.filter((app) =>
        app.name.toLowerCase().includes(filterLower),
      );
    }

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, gitConfig, ecsConfig, awsConfig } = body;
    if (!name || !gitConfig || !ecsConfig || !awsConfig) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await au.createApplication({
      name,
      gitConfig,
      ecsConfig,
      awsConfig,
    });

    switch (result.type) {
      case "Created":
        return NextResponse.json(
          { message: "Application created successfully" },
          { status: 201 },
        );
      case "AlreadyExists":
        return NextResponse.json(
          { error: "Application with this name already exists" },
          { status: 409 },
        );
      case "Invalid":
        return NextResponse.json(
          { error: "Validation failed", details: result.errors },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 },
    );
  }
}
