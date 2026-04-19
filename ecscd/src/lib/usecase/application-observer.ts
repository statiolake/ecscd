import {
  ApplicationDomain,
  ApplicationSyncStatus,
  ObservationFailure,
  ObservedApplicationDomain,
  ResourceResult,
  createLoadingObserved,
} from "../domain/application";
import { desiredToComparable } from "../domain/task-definition";
import { compareTaskDefinitions } from "../domain/task-definition-diff";
import { IAws } from "./port/aws";
import {
  GitTaskDefinitionError,
  IGithub,
} from "./port/github";
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
      return withDiffFailure(base, {
        type: "CurrentTaskDefinitionUnavailable",
        detail: "Current task definition ARN not found.",
      });
    }

    const desiredResult = await this.github.getTaskDefinition(
      application.gitConfig,
    );
    if (desiredResult.status === "Error") {
      return withDiffFailure(base, toObservationFailure(desiredResult.error));
    }

    let current;
    try {
      current = await this.aws.describeTaskDefinition(
        application.awsConfig,
        currentArn,
      );
    } catch (error) {
      return withDiffFailure(base, {
        type: "CurrentTaskDefinitionUnavailable",
        detail: toErrorMessage(error),
      });
    }
    if (!current) {
      return withDiffFailure(base, {
        type: "CurrentTaskDefinitionUnavailable",
        detail: "Current task definition not found.",
      });
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
): ResourceResult<
  { status: ApplicationSyncStatus; lastSyncedAt?: Date },
  ObservationFailure
> {
  return {
    status: "Success",
    value: {
      status,
      lastSyncedAt,
    },
  };
}

function withDiffFailure(
  base: ObservedApplicationDomain,
  failure: ObservationFailure,
): ObservedApplicationDomain {
  return {
    ...base,
    sync: { status: "Error", reason: failure },
    diff: { status: "Error", reason: failure },
  };
}

function toObservationFailure(
  error: GitTaskDefinitionError,
): ObservationFailure {
  switch (error.type) {
    case "InvalidRepositoryUrl":
      return {
        type: "GitSourceUnavailable",
        detail: `Invalid GitHub repository URL: "${error.url}"`,
      };
    case "RepositoryNotFound":
      return {
        type: "GitSourceUnavailable",
        detail: `GitHub repository ${error.owner}/${error.repo} not found or not accessible.`,
      };
    case "CommitNotFound":
      return {
        type: "GitSourceUnavailable",
        detail: `No commits found on branch "${error.branch}".`,
      };
    case "FileNotFound":
      return { type: "GitTaskDefinitionNotFound", path: error.path };
    case "InvalidTaskDefinition":
      return { type: "InvalidGitTaskDefinition", detail: error.reason };
    case "FetchFailed":
      return { type: "GitSourceUnavailable", detail: error.reason };
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Failed to compare ECS and GitHub configuration.";
}
