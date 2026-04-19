import { Octokit } from "@octokit/rest";
import {
  GitTaskDefinitionSource,
  parseGitHubRepoUrl,
} from "../domain/application";
import { TaskDefinitionValidationError } from "../domain/task-definition";
import {
  GitTaskDefinitionResult,
  IGithub,
} from "../usecase/port/github";
import { toDesiredTaskDefinitionSpec } from "./task-definition-normalizer";

export class GitHub implements IGithub {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async getTaskDefinition(
    source: GitTaskDefinitionSource
  ): Promise<GitTaskDefinitionResult> {
    const repoUrl = source.repo || "";
    const location = parseGitHubRepoUrl(repoUrl);
    if (!location) {
      return {
        status: "Error",
        error: { type: "InvalidRepositoryUrl", url: repoUrl },
      };
    }
    const { owner, repo } = location;
    const path = source.path || "";
    const branch = source.branch || "main";

    // repository の存在を先に確認することで、続く listCommits の 404 が
    // 「branch 不在」であることを確定できる。
    try {
      await this.octokit.rest.repos.get({ owner, repo });
    } catch (error) {
      if (isOctokitStatus(error, 404)) {
        return {
          status: "Error",
          error: { type: "RepositoryNotFound", owner, repo },
        };
      }
      return toFetchError(error);
    }

    let latestSha: string;
    try {
      const sha = await this.getLatestCommitSha(owner, repo, branch);
      if (!sha) {
        return {
          status: "Error",
          error: { type: "CommitNotFound", branch },
        };
      }
      latestSha = sha;
    } catch (error) {
      if (isOctokitStatus(error, 404)) {
        return {
          status: "Error",
          error: { type: "CommitNotFound", branch },
        };
      }
      return toFetchError(error);
    }

    let contentResponse;
    try {
      contentResponse = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: latestSha,
      });
    } catch (error) {
      if (isOctokitStatus(error, 404)) {
        return {
          status: "Error",
          error: { type: "FileNotFound", path },
        };
      }
      return toFetchError(error);
    }

    if (
      !("content" in contentResponse.data) ||
      !contentResponse.data.content
    ) {
      return {
        status: "Error",
        error: { type: "FileNotFound", path },
      };
    }

    const fileContent = Buffer.from(
      contentResponse.data.content,
      "base64"
    ).toString("utf8");

    return parseTaskDefinition(fileContent);
  }

  private async getLatestCommitSha(
    owner: string,
    repo: string,
    branch: string
  ): Promise<string | null> {
    const response = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: 1,
    });
    if (response.data.length === 0) {
      return null;
    }
    return response.data[0].sha;
  }
}

function parseTaskDefinition(content: string): GitTaskDefinitionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return {
      status: "Error",
      error: {
        type: "InvalidTaskDefinition",
        reason:
          error instanceof Error ? error.message : "JSON parse failed",
      },
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      status: "Error",
      error: {
        type: "InvalidTaskDefinition",
        reason: "Task definition must be a JSON object.",
      },
    };
  }

  const validation = toDesiredTaskDefinitionSpec(
    parsed as Record<string, unknown>,
  );
  if (!validation.ok) {
    return {
      status: "Error",
      error: {
        type: "InvalidTaskDefinition",
        reason: formatTaskDefinitionValidationErrors(validation.errors),
      },
    };
  }
  return {
    status: "Success",
    taskDefinition: validation.spec,
  };
}

function formatTaskDefinitionValidationErrors(
  errors: TaskDefinitionValidationError[],
): string {
  return errors
    .map((error) => {
      switch (error.type) {
        case "MissingFamily":
          return "missing required field 'family'";
        case "MissingContainerDefinitions":
          return "missing required field 'containerDefinitions'";
        case "EmptyContainerDefinitions":
          return "'containerDefinitions' must contain at least one container";
      }
    })
    .join("; ");
}

function toFetchError(error: unknown): GitTaskDefinitionResult {
  return {
    status: "Error",
    error: {
      type: "FetchFailed",
      reason: error instanceof Error ? error.message : "Unknown fetch error",
    },
  };
}

function isOctokitStatus(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === status
  );
}
