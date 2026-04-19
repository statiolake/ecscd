import { ApplicationDomain } from "../domain/application";
import { DeploymentRepository } from "../repository/deployment";

export interface SyncApplicationCommand {
  application: ApplicationDomain;
}

export interface RollbackApplicationCommand {
  application: ApplicationDomain;
}

export type SyncApplicationResult =
  | { type: "Succeeded" }
  | { type: "Failed"; reason: string };

export type RollbackApplicationResult =
  | { type: "Succeeded" }
  | { type: "Failed"; reason: string };

export interface IDeploymentUsecase {
  syncApplication(
    command: SyncApplicationCommand,
  ): Promise<SyncApplicationResult>;
  rollbackApplication(
    command: RollbackApplicationCommand,
  ): Promise<RollbackApplicationResult>;
}

export class DeploymentUsecase implements IDeploymentUsecase {
  constructor(private deploymentRepository: DeploymentRepository) {}

  async syncApplication(
    command: SyncApplicationCommand,
  ): Promise<SyncApplicationResult> {
    try {
      await this.deploymentRepository.syncService(command.application);
      return { type: "Succeeded" };
    } catch (error) {
      return {
        type: "Failed",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to synchronize service.",
      };
    }
  }

  async rollbackApplication(
    command: RollbackApplicationCommand,
  ): Promise<RollbackApplicationResult> {
    try {
      await this.deploymentRepository.rollback(command.application);
      return { type: "Succeeded" };
    } catch (error) {
      return {
        type: "Failed",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to roll back service.",
      };
    }
  }
}
