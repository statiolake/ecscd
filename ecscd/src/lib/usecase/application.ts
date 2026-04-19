import {
  ApplicationDomain,
  AwsAccessProfile,
  EcsServiceTarget,
  GitTaskDefinitionSource,
  ObservedApplicationDomain,
  create as createApplicationDomain,
  updateSettings as updateApplicationSettings,
} from "../domain/application";
import { ApplicationRepository } from "../repository/application";
import { ApplicationObserver } from "../repository/application-observer";

export interface CreateApplicationCommand {
  name: string;
  gitConfig: GitTaskDefinitionSource;
  ecsConfig: EcsServiceTarget;
  awsConfig: AwsAccessProfile;
}

export type CreateApplicationResult =
  | { type: "Created"; application: ApplicationDomain }
  | { type: "AlreadyExists"; name: string };

export interface UpdateApplicationSettingsCommand {
  name: string;
  gitConfig: GitTaskDefinitionSource;
  ecsConfig: EcsServiceTarget;
  awsConfig: AwsAccessProfile;
}

export type UpdateApplicationResult =
  | { type: "Updated"; application: ApplicationDomain }
  | { type: "NotFound"; name: string };

export type DeleteApplicationResult =
  | { type: "Deleted"; name: string }
  | { type: "NotFound"; name: string };

export interface IApplicationUsecase {
  getApplications(): Promise<ApplicationDomain[]>;
  getApplicationNames(): Promise<string[]>;
  getApplication(name: string): Promise<ApplicationDomain | null>;
  observeApplication(
    application: ApplicationDomain,
  ): Promise<ObservedApplicationDomain>;
  createApplication(
    command: CreateApplicationCommand,
  ): Promise<CreateApplicationResult>;
  updateApplicationSettings(
    command: UpdateApplicationSettingsCommand,
  ): Promise<UpdateApplicationResult>;
  deleteApplication(name: string): Promise<DeleteApplicationResult>;
}

export class ApplicationUsecase implements IApplicationUsecase {
  constructor(
    private applicationRepository: ApplicationRepository,
    private applicationObserver: ApplicationObserver,
  ) {}

  async observeApplication(
    application: ApplicationDomain,
  ): Promise<ObservedApplicationDomain> {
    return this.applicationObserver.observe(application);
  }

  async getApplications(): Promise<ApplicationDomain[]> {
    return this.applicationRepository.getApplications();
  }

  async getApplicationNames(): Promise<string[]> {
    return this.applicationRepository.getApplicationNames();
  }

  async getApplication(name: string): Promise<ApplicationDomain | null> {
    return this.applicationRepository.getApplication(name);
  }

  async createApplication(
    command: CreateApplicationCommand,
  ): Promise<CreateApplicationResult> {
    const existing = await this.applicationRepository.getApplication(
      command.name,
    );
    if (existing) {
      return { type: "AlreadyExists", name: command.name };
    }
    const application = createApplicationDomain({
      name: command.name,
      gitConfig: command.gitConfig,
      ecsConfig: command.ecsConfig,
      awsConfig: command.awsConfig,
      now: new Date(),
    });
    await this.applicationRepository.createApplication(application);
    return { type: "Created", application };
  }

  async updateApplicationSettings(
    command: UpdateApplicationSettingsCommand,
  ): Promise<UpdateApplicationResult> {
    const existing = await this.applicationRepository.getApplication(
      command.name,
    );
    if (!existing) {
      return { type: "NotFound", name: command.name };
    }
    const updated = updateApplicationSettings(existing, {
      gitConfig: command.gitConfig,
      ecsConfig: command.ecsConfig,
      awsConfig: command.awsConfig,
      now: new Date(),
    });
    await this.applicationRepository.updateApplication(updated);
    return { type: "Updated", application: updated };
  }

  async deleteApplication(name: string): Promise<DeleteApplicationResult> {
    const existing = await this.applicationRepository.getApplication(name);
    if (!existing) {
      return { type: "NotFound", name };
    }
    await this.applicationRepository.deleteApplication(name);
    return { type: "Deleted", name };
  }
}
