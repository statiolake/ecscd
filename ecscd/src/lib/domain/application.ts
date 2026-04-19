export type ApplicationSyncStatus = "InSync" | "OutOfSync";
export type ResourceStatus = "Loading" | "Success" | "Error";
export type EcsServiceStatus =
  | "ACTIVE"
  | "DRAINING"
  | "INACTIVE"
  | "Unknown";
export type EcsDeploymentStatus =
  | "PRIMARY"
  | "ACTIVE"
  | "INACTIVE"
  | "Unknown";
export type EcsRolloutState =
  | "COMPLETED"
  | "FAILED"
  | "IN_PROGRESS"
  | "Unknown";

export type ApplicationStatus =
  | "Loading"
  | "Error"
  | "Deploying"
  | "Failed"
  | "OutOfSync"
  | "InSync";

export type ApplicationLoadingReason =
  | { type: "ObservationPending" }
  | { type: "ServiceStateLoading" }
  | { type: "DiffLoading" }
  | { type: "SyncStatusLoading" };

export type ApplicationErrorReason =
  | { type: "ServiceStateUnavailable"; failure?: ObservationFailure }
  | { type: "SyncComparisonFailed"; failure?: ObservationFailure }
  | { type: "ServiceNotActive"; serviceStatus: EcsServiceStatus }
  | { type: "SyncStatusUndetermined" };

export type ApplicationDeployingReason =
  | { type: "DeploymentInProgress"; rolloutStateReason?: string };

export type ApplicationFailedReason =
  | { type: "DeploymentFailed"; rolloutStateReason?: string };

export type ApplicationStatusReason =
  | { status: "Loading"; reason: ApplicationLoadingReason }
  | { status: "Error"; reason: ApplicationErrorReason }
  | { status: "Deploying"; reason: ApplicationDeployingReason }
  | { status: "Failed"; reason: ApplicationFailedReason }
  | { status: "OutOfSync" }
  | { status: "InSync" };

export interface GitTaskDefinitionSource {
  repo: string;
  branch: string;
  path: string;
}

export interface EcsServiceTarget {
  cluster: string;
  service: string;
}

export interface AwsAccessProfile {
  region?: string;
  roleArn?: string;
  externalId: string;
}

export interface ApplicationDomain {
  name: string;
  gitConfig: GitTaskDefinitionSource;
  ecsConfig: EcsServiceTarget;
  awsConfig: AwsAccessProfile;
  createdAt: Date;
  updatedAt: Date;
}

export type ObservationFailure =
  | { type: "GitSourceUnavailable"; detail: string }
  | { type: "InvalidGitTaskDefinition"; detail: string }
  | { type: "GitTaskDefinitionNotFound"; path: string }
  | { type: "CurrentTaskDefinitionUnavailable"; detail?: string }
  | { type: "EcsServiceUnavailable"; detail?: string }
  | { type: "Unknown"; detail: string };

export interface ObservedApplicationDomain extends ApplicationDomain {
  sync: ResourceResult<ApplicationSyncDomain, ObservationFailure>;
  diff: ResourceResult<DiffDomain[], ObservationFailure>;
  service: ResourceResult<ServiceDomain, ObservationFailure>;
  observedAt: Date;
}

export interface CreateApplicationInput {
  name: string;
  gitConfig: GitTaskDefinitionSource;
  ecsConfig: EcsServiceTarget;
  awsConfig: AwsAccessProfile;
  now: Date;
}

export interface UpdateApplicationSettingsInput {
  gitConfig: GitTaskDefinitionSource;
  ecsConfig: EcsServiceTarget;
  awsConfig: AwsAccessProfile;
  now: Date;
}

export type ResourceResult<T, E = string> =
  | { status: "Loading" }
  | { status: "Success"; value: T }
  | { status: "Error"; reason: E };

export function createLoadingResource<T, E = string>(): ResourceResult<T, E> {
  return { status: "Loading" };
}

export type ApplicationValidationErrorField =
  | "name"
  | "git.repo"
  | "git.branch"
  | "git.path"
  | "ecs.cluster"
  | "ecs.service"
  | "aws.externalId";

export type ApplicationValidationErrorKind = "Empty" | "InvalidUrl";

export interface ApplicationValidationError {
  field: ApplicationValidationErrorField;
  kind: ApplicationValidationErrorKind;
}

export type CreateApplicationDomainResult =
  | { ok: true; application: ApplicationDomain }
  | { ok: false; errors: ApplicationValidationError[] };

export type UpdateApplicationDomainResult =
  | { ok: true; application: ApplicationDomain }
  | { ok: false; errors: ApplicationValidationError[] };

const GITHUB_REPO_URL_PATTERN =
  /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/;

export interface GitHubRepoLocation {
  owner: string;
  repo: string;
}

export function parseGitHubRepoUrl(url: string): GitHubRepoLocation | null {
  const match = url.match(GITHUB_REPO_URL_PATTERN);
  if (!match) {
    return null;
  }
  return { owner: match[1], repo: match[2] };
}

export function isValidGitHubRepoUrl(url: string): boolean {
  return parseGitHubRepoUrl(url) !== null;
}

function isBlank(value: string | undefined | null): boolean {
  return !value || !value.trim();
}

function validateGitConfig(
  gitConfig: GitTaskDefinitionSource,
): ApplicationValidationError[] {
  const errors: ApplicationValidationError[] = [];
  if (isBlank(gitConfig.repo)) {
    errors.push({ field: "git.repo", kind: "Empty" });
  } else if (!isValidGitHubRepoUrl(gitConfig.repo)) {
    errors.push({ field: "git.repo", kind: "InvalidUrl" });
  }
  if (isBlank(gitConfig.branch)) {
    errors.push({ field: "git.branch", kind: "Empty" });
  }
  if (isBlank(gitConfig.path)) {
    errors.push({ field: "git.path", kind: "Empty" });
  }
  return errors;
}

function validateEcsConfig(
  ecsConfig: EcsServiceTarget,
): ApplicationValidationError[] {
  const errors: ApplicationValidationError[] = [];
  if (isBlank(ecsConfig.cluster)) {
    errors.push({ field: "ecs.cluster", kind: "Empty" });
  }
  if (isBlank(ecsConfig.service)) {
    errors.push({ field: "ecs.service", kind: "Empty" });
  }
  return errors;
}

function validateAwsConfig(
  awsConfig: AwsAccessProfile,
): ApplicationValidationError[] {
  const errors: ApplicationValidationError[] = [];
  if (isBlank(awsConfig.externalId)) {
    errors.push({ field: "aws.externalId", kind: "Empty" });
  }
  return errors;
}

export function create(
  input: CreateApplicationInput,
): CreateApplicationDomainResult {
  const errors: ApplicationValidationError[] = [];
  if (isBlank(input.name)) {
    errors.push({ field: "name", kind: "Empty" });
  }
  errors.push(
    ...validateGitConfig(input.gitConfig),
    ...validateEcsConfig(input.ecsConfig),
    ...validateAwsConfig(input.awsConfig),
  );
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    application: {
      name: input.name,
      gitConfig: input.gitConfig,
      ecsConfig: input.ecsConfig,
      awsConfig: input.awsConfig,
      createdAt: input.now,
      updatedAt: input.now,
    },
  };
}

export function updateSettings(
  application: ApplicationDomain,
  input: UpdateApplicationSettingsInput,
): UpdateApplicationDomainResult {
  const errors: ApplicationValidationError[] = [
    ...validateGitConfig(input.gitConfig),
    ...validateEcsConfig(input.ecsConfig),
    ...validateAwsConfig(input.awsConfig),
  ];
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    application: {
      ...application,
      gitConfig: input.gitConfig,
      ecsConfig: input.ecsConfig,
      awsConfig: input.awsConfig,
      updatedAt: input.now,
    },
  };
}

export function createLoadingObserved(
  application: ApplicationDomain,
  observedAt: Date = new Date(),
): ObservedApplicationDomain {
  return {
    ...application,
    sync: createLoadingResource(),
    diff: createLoadingResource(),
    service: createLoadingResource(),
    observedAt,
  };
}

export interface ApplicationSyncDomain {
  status: ApplicationSyncStatus;
  lastSyncedAt?: Date;
}

export interface ServiceDomain {
  status: EcsServiceStatus;
  desiredCount: number;
  runningCount: number;
  taskDefinition: string;
  deployments: {
    status: EcsDeploymentStatus;
    createdAt: Date;
    updatedAt: Date;
    rolloutState: EcsRolloutState;
    rolloutStateReason: string;
  }[];
}

export interface DiffDomain {
  path: string;
  current?: string;
  target?: string;
  type: "Added" | "Removed" | "Modified";
}

export function getApplicationCurrentDeployment(
  application: ObservedApplicationDomain,
): ServiceDomain["deployments"][number] | null {
  if (application.service.status !== "Success") {
    return null;
  }

  const service = application.service.value;
  return (
    service.deployments.find((deployment) => deployment.status === "PRIMARY") ||
    service.deployments[0] ||
    null
  );
}

export function getApplicationStatus(
  application: ObservedApplicationDomain,
): ApplicationStatusReason {
  if (application.service.status === "Loading") {
    return {
      status: "Loading",
      reason: { type: "ServiceStateLoading" },
    };
  }

  if (application.service.status === "Error") {
    return {
      status: "Error",
      reason: {
        type: "ServiceStateUnavailable",
        failure: application.service.reason,
      },
    };
  }

  const service = application.service.value;

  if (application.sync.status === "Error") {
    const failure =
      application.sync.reason ??
      (application.diff.status === "Error" ? application.diff.reason : undefined);
    return {
      status: "Error",
      reason: { type: "SyncComparisonFailed", failure },
    };
  }

  if (!service) {
    return {
      status: "Error",
      reason: { type: "ServiceStateUnavailable" },
    };
  }

  if (service.status !== "ACTIVE") {
    return {
      status: "Error",
      reason: { type: "ServiceNotActive", serviceStatus: service.status },
    };
  }

  const currentDeployment = getApplicationCurrentDeployment(application);

  if (currentDeployment?.rolloutState === "IN_PROGRESS") {
    return {
      status: "Deploying",
      reason: {
        type: "DeploymentInProgress",
        rolloutStateReason: currentDeployment.rolloutStateReason || undefined,
      },
    };
  }

  if (currentDeployment?.rolloutState === "FAILED") {
    return {
      status: "Failed",
      reason: {
        type: "DeploymentFailed",
        rolloutStateReason: currentDeployment.rolloutStateReason || undefined,
      },
    };
  }

  if (application.diff.status === "Loading") {
    return {
      status: "Loading",
      reason: { type: "DiffLoading" },
    };
  }

  if (application.diff.status === "Error") {
    return {
      status: "Error",
      reason: {
        type: "SyncComparisonFailed",
        failure: application.diff.reason,
      },
    };
  }

  if (application.sync.status === "Loading") {
    return {
      status: "Loading",
      reason: { type: "SyncStatusLoading" },
    };
  }

  const sync = application.sync.value;

  if (!sync) {
    return {
      status: "Error",
      reason: { type: "SyncStatusUndetermined" },
    };
  }

  if (sync.status === "OutOfSync") {
    return {
      status: "OutOfSync",
    };
  }

  return {
    status: "InSync",
  };
}

export function getApplicationDiffs(
  application: ObservedApplicationDomain,
): DiffDomain[] {
  return application.diff.status === "Success" ? application.diff.value : [];
}

export function getApplicationDiffCount(
  application: ObservedApplicationDomain,
): number {
  return getApplicationDiffs(application).length;
}

