import { NextRequest, NextResponse } from "next/server";
import { du } from "@/lib/di";
import { GitTaskDefinitionError } from "@/lib/infrastructure/interface/github";

function formatGitError(error: GitTaskDefinitionError): string {
  switch (error.type) {
    case "InvalidRepositoryUrl":
      return `Invalid GitHub repository URL: "${error.url}"`;
    case "CommitNotFound":
      return `No commits found on branch "${error.branch}".`;
    case "FileNotFound":
      return `Task definition file not found at "${error.path}".`;
    case "InvalidTaskDefinition":
      return `Invalid task definition: ${error.reason}`;
    case "FetchFailed":
      return `Failed to fetch task definition from GitHub: ${error.reason}`;
  }
}

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

    const result = await du.syncApplication({ name });
    switch (result.type) {
      case "Succeeded":
        return NextResponse.json(
          { message: "Service synchronized successfully" },
          { status: 200 }
        );
      case "NotFound":
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      case "GitFailure":
        return NextResponse.json(
          { error: formatGitError(result.error) },
          { status: 502 }
        );
      case "AwsFailure":
        return NextResponse.json(
          { error: result.reason },
          { status: 502 }
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
