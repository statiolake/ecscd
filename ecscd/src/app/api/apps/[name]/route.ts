import { au } from "@/lib/di";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    if (!name) {
      return NextResponse.json(
        { error: "Missing application name" },
        { status: 400 },
      );
    }

    const application = await au.getApplication(name);
    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(await au.observeApplication(application));
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const body = await request.json();
    const { gitConfig, ecsConfig, awsConfig } = body;
    const { name } = await params;
    if (!name || !gitConfig || !ecsConfig || !awsConfig) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await au.updateApplicationSettings({
      name,
      gitConfig,
      ecsConfig,
      awsConfig,
    });

    switch (result.type) {
      case "Updated":
        return NextResponse.json(
          { message: "Application updated successfully" },
          { status: 200 },
        );
      case "NotFound":
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 },
        );
    }
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    if (!name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await au.deleteApplication(name);

    switch (result.type) {
      case "Deleted":
        return NextResponse.json(
          { message: "Application deleted successfully" },
          { status: 200 },
        );
      case "NotFound":
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 },
        );
    }
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 },
    );
  }
}
