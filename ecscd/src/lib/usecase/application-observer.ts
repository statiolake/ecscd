import {
  ApplicationDomain,
  ApplicationSyncStatus,
  ObservedApplicationDomain,
  ResourceResult,
  createLoadingObserved,
} from "../domain/application";
import { desiredToComparable } from "../domain/task-definition";
import { compareTaskDefinitions } from "../domain/task-definition-diff";
import { IAws } from "../infrastructure/interface/aws";
import {
  GitTaskDefinitionError,
  IGithub,
} from "../infrastructure/interface/github";
import { ApplicationObserver } from "../repository/application-observer";
import { ServiceStateProvider } from "../repository/service-state-provider";

export class DefaultApplicationObserver implements ApplicationObserver {
  constructor(
    private serviceStateProvider: ServiceStateProvider,
    private aws: IAws,
    private github: IGithub,
  ) {}

  async observe(
    application: ApplicationDomain,
  ): Promise<ObservedApplicationDomain> {
    const observedAt = new Date();
    const service = await this.serviceStateProvider.fetchService(application);
    const base: ObservedApplicationDomain = {
      ...createLoadingObserved(application, observedAt),
      service,
    };

    if (service.status !== "Success") {
      return base;
    }

    if (service.value.status !== "ACTIVE") {
      return base;
    }

    const currentArn = service.value.taskDefinition;
    if (!currentArn) {
      return withDiffError(base, "Current task definition ARN not found.");
    }

    const desiredResult = await this.github.getTaskDefinition(
      application.gitConfig,
    );
    if (desiredResult.status === "Error") {
      return withDiffError(base, formatGitTaskDefinitionError(desiredResult.error));
    }

    let current;
    try {
      current = await this.aws.describeTaskDefinition(
        application.awsConfig,
        currentArn,
      );
    } catch (error) {
      return withDiffError(base, toErrorMessage(error));
    }
    if (!current) {
      return withDiffError(base, "Current task definition not found.");
    }

    const target = desiredToComparable(desiredResult.taskDefinition);
    const deployments = compareTaskDefinitions(current, target);

    return {
      ...base,
      sync: toSyncResource(
        deployments.length > 0 ? "OutOfSync" : "InSync",
        undefined,
      ),
      diff: {
        status: "Success",
        value: deployments,
      },
    };
  }
}

function toSyncResource(
  status: ApplicationSyncStatus,
  lastSyncedAt: Date | undefined,
): ResourceResult<{ status: ApplicationSyncStatus; lastSyncedAt?: Date }> {
  return {
    status: "Success",
    value: {
      status,
      lastSyncedAt,
    },
  };
}

function withDiffError(
  base: ObservedApplicationDomain,
  reason: string,
): ObservedApplicationDomain {
  return {
    ...base,
    sync: { status: "Error", reason },
    diff: { status: "Error", reason },
  };
}

function formatGitTaskDefinitionError(error: GitTaskDefinitionError): string {
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Failed to compare ECS and GitHub configuration.";
}
