import { IAws } from "./port/aws";
import {
  GitTaskDefinitionError,
  IGithub,
} from "./port/github";
import { ApplicationRepository } from "../repository/application";

export interface SyncApplicationCommand {
  name: string;
}

export interface RollbackApplicationCommand {
  name: string;
}

export type SyncApplicationResult =
  | { type: "Succeeded" }
  | { type: "NotFound"; name: string }
  | { type: "GitFailure"; error: GitTaskDefinitionError }
  | { type: "AwsFailure"; reason: string };

export type RollbackApplicationResult =
  | { type: "Succeeded" }
  | { type: "NotFound"; name: string }
  | { type: "AwsFailure"; reason: string };

export interface IDeploymentUsecase {
  syncApplication(
    command: SyncApplicationCommand,
  ): Promise<SyncApplicationResult>;
  rollbackApplication(
    command: RollbackApplicationCommand,
  ): Promise<RollbackApplicationResult>;
}

export class DeploymentUsecase implements IDeploymentUsecase {
  constructor(
    private applicationRepository: ApplicationRepository,
    private aws: IAws,
    private github: IGithub,
  ) {}

  async syncApplication(
    command: SyncApplicationCommand,
  ): Promise<SyncApplicationResult> {
    const application = await this.applicationRepository.getApplication(
      command.name,
    );
    if (!application) {
      return { type: "NotFound", name: command.name };
    }

    const desiredResult = await this.github.getTaskDefinition(
      application.gitConfig,
    );
    if (desiredResult.status === "Error") {
      return { type: "GitFailure", error: desiredResult.error };
    }

    try {
      const taskDefinitionArn = await this.aws.registerTaskDefinition(
        application.awsConfig,
        desiredResult.taskDefinition,
      );
      await this.aws.updateService(
        application.awsConfig,
        application.ecsConfig,
        taskDefinitionArn,
      );
      return { type: "Succeeded" };
    } catch (error) {
      return {
        type: "AwsFailure",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to synchronize service with AWS.",
      };
    }
  }

  async rollbackApplication(
    command: RollbackApplicationCommand,
  ): Promise<RollbackApplicationResult> {
    const application = await this.applicationRepository.getApplication(
      command.name,
    );
    if (!application) {
      return { type: "NotFound", name: command.name };
    }

    try {
      await this.aws.stopServiceDeployment(
        application.awsConfig,
        application.ecsConfig,
      );
      return { type: "Succeeded" };
    } catch (error) {
      return {
        type: "AwsFailure",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to roll back service on AWS.",
      };
    }
  }
}
