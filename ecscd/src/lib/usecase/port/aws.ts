import { ApplicationDomain, ServiceDomain } from "../../domain/application";
import {
  ComparableTaskDefinition,
  DesiredTaskDefinitionSpec,
} from "../../domain/task-definition";

export interface IAws {
  registerTaskDefinition(
    awsConfig: ApplicationDomain["awsConfig"],
    taskDef: DesiredTaskDefinitionSpec
  ): Promise<string>;
  updateService(
    awsConfig: ApplicationDomain["awsConfig"],
    ecsConfig: ApplicationDomain["ecsConfig"],
    taskDefinitionArn: string
  ): Promise<void>;
  describeServices(
    awsConfig: ApplicationDomain["awsConfig"],
    ecsConfig: ApplicationDomain["ecsConfig"]
  ): Promise<ServiceDomain | undefined>;
  describeTaskDefinition(
    awsConfig: ApplicationDomain["awsConfig"],
    taskDefinitionArn: string
  ): Promise<ComparableTaskDefinition | undefined>;
  stopServiceDeployment(
    awsConfig: ApplicationDomain["awsConfig"],
    ecsConfig: ApplicationDomain["ecsConfig"]
  ): Promise<void>;
}
