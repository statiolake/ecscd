import {
  ApplicationDomain,
  ObservationFailure,
  ResourceResult,
  ServiceDomain,
} from "../domain/application";

export interface ServiceStateProvider {
  fetchService(
    application: ApplicationDomain,
  ): Promise<ResourceResult<ServiceDomain, ObservationFailure>>;
}
