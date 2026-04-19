import { ApplicationDomain, ServiceDomain } from "../../domain/application";
import {
  ComparableTaskDefinition,
  DesiredTaskDefinitionSpec,
  TaskDefinitionValidationError,
} from "../../domain/task-definition";

export type DescribeTaskDefinitionResult =
  | { status: "Success"; taskDefinition: ComparableTaskDefinition }
  | { status: "NotFound" }
  | { status: "Invalid"; errors: TaskDefinitionValidationError[] };

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
  ): Promise<DescribeTaskDefinitionResult>;
  stopServiceDeployment(
    awsConfig: ApplicationDomain["awsConfig"],
    ecsConfig: ApplicationDomain["ecsConfig"]
  ): Promise<void>;
}
