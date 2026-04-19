import { ApplicationDomain, ServiceDomain } from "../domain/application";
import { ComparableTaskDefinition } from "../domain/task-definition";

export interface TaskDefinitionsForDiff {
  current: ComparableTaskDefinition;
  target: ComparableTaskDefinition;
}

export interface DeploymentRepository {
  syncService(application: ApplicationDomain): Promise<void>;
  rollback(application: ApplicationDomain): Promise<void>;
  getTaskDefinitionsForDiff(
    application: ApplicationDomain,
    service?: ServiceDomain,
  ): Promise<TaskDefinitionsForDiff>;
}
