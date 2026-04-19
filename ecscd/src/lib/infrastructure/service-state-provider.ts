import {
  ApplicationDomain,
  ObservationFailure,
  ResourceResult,
  ServiceDomain,
} from "../domain/application";
import { ServiceStateProvider } from "../repository/service-state-provider";
import { IAws } from "./interface/aws";

export class AwsServiceStateProvider implements ServiceStateProvider {
  constructor(private aws: IAws) {}

  async fetchService(
    application: ApplicationDomain,
  ): Promise<ResourceResult<ServiceDomain, ObservationFailure>> {
    try {
      const ecsResponse = await this.aws.describeServices(
        application.awsConfig,
        application.ecsConfig,
      );

      if (!ecsResponse) {
        return {
          status: "Error",
          reason: {
            type: "EcsServiceUnavailable",
            detail: "ECS service not found.",
          },
        };
      }

      return {
        status: "Success",
        value: ecsResponse,
      };
    } catch (error) {
      console.warn(`Error fetching ECS service for ${application.name}:`, error);
      return {
        status: "Error",
        reason: {
          type: "EcsServiceUnavailable",
          detail:
            error instanceof Error
              ? error.message
              : "Failed to fetch ECS service state.",
        },
      };
    }
  }
}
