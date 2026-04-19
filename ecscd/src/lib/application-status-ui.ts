import {
  ApplicationDeployingReason,
  ApplicationErrorReason,
  ApplicationFailedReason,
  ApplicationLoadingReason,
  ApplicationStatus,
  ApplicationStatusReason,
  ObservedApplicationDomain,
  getApplicationStatus,
} from "@/lib/domain/application";

// 観測が始まっていない ApplicationDomain をどう解釈するかは UI/query 側の関心。
// domain の getApplicationStatus は observed のみを受け、未観測の扱いはここで決める。
export function getApplicationViewStatus(
  observed: ObservedApplicationDomain | null,
): ApplicationStatusReason {
  if (!observed) {
    return {
      status: "Loading",
      reason: { type: "ObservationPending" },
    };
  }
  return getApplicationStatus(observed);
}

export function formatApplicationStatus(status: ApplicationStatus) {
  switch (status) {
    case "Loading":
      return "Loading";
    case "InSync":
      return "In Sync";
    case "OutOfSync":
      return "Out of Sync";
    case "Deploying":
      return "Deploying";
    case "Failed":
      return "Deploy Failed";
    case "Error":
      return "Error";
    default:
      return status;
  }
}

export function formatApplicationStatusReason(
  reason: ApplicationStatusReason,
): string | undefined {
  switch (reason.status) {
    case "Loading":
      return formatLoadingReason(reason.reason);
    case "Error":
      return formatErrorReason(reason.reason);
    case "Deploying":
      return formatDeployingReason(reason.reason);
    case "Failed":
      return formatFailedReason(reason.reason);
    case "InSync":
    case "OutOfSync":
      return undefined;
  }
}

function formatLoadingReason(reason: ApplicationLoadingReason): string {
  switch (reason.type) {
    case "ObservationPending":
    case "ServiceStateLoading":
      return "Loading ECS service state...";
    case "DiffLoading":
      return "Loading configuration diff...";
    case "SyncStatusLoading":
      return "Loading sync status...";
  }
}

function formatErrorReason(reason: ApplicationErrorReason): string {
  switch (reason.type) {
    case "ServiceStateUnavailable":
      return reason.detail || "Failed to fetch ECS service state.";
    case "SyncComparisonFailed":
      return (
        reason.detail || "Failed to compare ECS and GitHub configuration."
      );
    case "ServiceNotActive":
      return `ECS service is ${reason.serviceStatus}. ecscd requires an ACTIVE service.`;
    case "SyncStatusUndetermined":
      return "Failed to determine sync status.";
  }
}

function formatDeployingReason(reason: ApplicationDeployingReason): string {
  switch (reason.type) {
    case "DeploymentInProgress":
      return reason.detail || "Deployment is in progress.";
  }
}

function formatFailedReason(reason: ApplicationFailedReason): string {
  switch (reason.type) {
    case "DeploymentFailed":
      return reason.detail || "The last deployment failed.";
  }
}

export function formatDiffSummary(count: number): string {
  return `${count} changes`;
}

export function getApplicationStatusDotClass(status: ApplicationStatus) {
  switch (status) {
    case "Loading":
      return "bg-zinc-400";
    case "InSync":
      return "bg-emerald-500";
    case "OutOfSync":
      return "bg-yellow-500";
    case "Deploying":
      return "bg-yellow-500";
    case "Failed":
      return "bg-rose-500";
    case "Error":
      return "bg-rose-500";
    default:
      return "bg-zinc-400";
  }
}

export function getApplicationStatusTextClass(status: ApplicationStatus) {
  switch (status) {
    case "Loading":
      return "text-muted-foreground";
    case "InSync":
      return "text-emerald-600";
    case "OutOfSync":
      return "text-amber-600";
    case "Deploying":
      return "text-amber-600";
    case "Failed":
      return "text-rose-600";
    case "Error":
      return "text-rose-600";
    default:
      return "text-muted-foreground";
  }
}

export function getApplicationStatusBadgeClass(status: ApplicationStatus) {
  switch (status) {
    case "Loading":
      return "border-transparent bg-secondary text-secondary-foreground";
    case "InSync":
      return "border-transparent bg-emerald-500 text-white";
    case "OutOfSync":
      return "border-transparent bg-yellow-500 text-white";
    case "Deploying":
      return "border-transparent bg-yellow-500 text-white";
    case "Failed":
      return "border-transparent bg-rose-500 text-white";
    case "Error":
      return "border-transparent bg-rose-500 text-white";
    default:
      return "border-transparent bg-secondary text-secondary-foreground";
  }
}
