export type ApplicationSyncStatus = "InSync" | "OutOfSync";
export type ResourceStatus = "Loading" | "Success" | "Error";
export type EcsServiceStatus = "ACTIVE" | "DRAINING" | "INACTIVE";
export type EcsDeploymentStatus = "PRIMARY" | "ACTIVE" | "INACTIVE";
export type EcsRolloutState = "COMPLETED" | "FAILED" | "IN_PROGRESS";

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
  | { type: "ServiceStateUnavailable"; detail?: string }
  | { type: "SyncComparisonFailed"; detail?: string }
  | { type: "ServiceNotActive"; serviceStatus: EcsServiceStatus }
  | { type: "SyncStatusUndetermined" };

export type ApplicationDeployingReason =
  | { type: "DeploymentInProgress"; detail?: string };

export type ApplicationFailedReason =
  | { type: "DeploymentFailed"; detail?: string };

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

export interface ObservedApplicationDomain extends ApplicationDomain {
  sync: ResourceResult<ApplicationSyncDomain>;
  diff: ResourceResult<DiffDomain[]>;
  service: ResourceResult<ServiceDomain>;
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

export type ResourceResult<T> =
  | { status: "Loading" }
  | { status: "Success"; value: T }
  | { status: "Error"; reason: string };

export function createLoadingResource<T>(): ResourceResult<T> {
  return { status: "Loading" };
}

export function create(input: CreateApplicationInput): ApplicationDomain {
  return {
    name: input.name,
    gitConfig: input.gitConfig,
    ecsConfig: input.ecsConfig,
    awsConfig: input.awsConfig,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function updateSettings(
  application: ApplicationDomain,
  input: UpdateApplicationSettingsInput,
): ApplicationDomain {
  return {
    ...application,
    gitConfig: input.gitConfig,
    ecsConfig: input.ecsConfig,
    awsConfig: input.awsConfig,
    updatedAt: input.now,
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

export function isObservedApplication(
  application: ApplicationDomain | ObservedApplicationDomain,
): application is ObservedApplicationDomain {
  return "sync" in application && "diff" in application && "service" in application;
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
  application: ApplicationDomain | ObservedApplicationDomain,
): ServiceDomain["deployments"][number] | null {
  if (!isObservedApplication(application)) {
    return null;
  }

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
  application: ApplicationDomain | ObservedApplicationDomain,
): ApplicationStatusReason {
  if (!isObservedApplication(application)) {
    return {
      status: "Loading",
      reason: { type: "ObservationPending" },
    };
  }

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
        detail: application.service.reason,
      },
    };
  }

  const service = application.service.value;

  if (application.sync.status === "Error") {
    const detail =
      application.sync.reason ||
      (application.diff.status === "Error"
        ? application.diff.reason
        : undefined);
    return {
      status: "Error",
      reason: { type: "SyncComparisonFailed", detail },
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
        detail: currentDeployment.rolloutStateReason || undefined,
      },
    };
  }

  if (currentDeployment?.rolloutState === "FAILED") {
    return {
      status: "Failed",
      reason: {
        type: "DeploymentFailed",
        detail: currentDeployment.rolloutStateReason || undefined,
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
        detail: application.diff.reason,
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
  application: ApplicationDomain | ObservedApplicationDomain,
): DiffDomain[] {
  if (!isObservedApplication(application)) {
    return [];
  }

  return application.diff.status === "Success" ? application.diff.value : [];
}

export function getApplicationDiffCount(
  application: ApplicationDomain | ObservedApplicationDomain,
): number {
  return getApplicationDiffs(application).length;
}
