import {
  FilterDomain,
  create as createFilterDomain,
} from "../domain/filter";
import { Clock } from "../infrastructure/interface/clock";
import { IdGenerator } from "../infrastructure/interface/id-generator";
import { FilterRepository } from "../repository/filter";

export interface IFilterUsecase {
  getFilters(): Promise<FilterDomain[]>;
  getFilterById(id: string): Promise<FilterDomain | null>;
  createFilter(name: string, pattern: string): Promise<FilterDomain>;
  deleteFilter(id: string): Promise<void>;
}

export class FilterUsecase implements IFilterUsecase {
  constructor(
    private filterRepository: FilterRepository,
    private clock: Clock,
    private idGenerator: IdGenerator,
  ) {}

  async getFilters(): Promise<FilterDomain[]> {
    return this.filterRepository.getFilters();
  }

  async getFilterById(id: string): Promise<FilterDomain | null> {
    return this.filterRepository.getFilterById(id);
  }

  async createFilter(name: string, pattern: string): Promise<FilterDomain> {
    const filter = createFilterDomain({
      id: this.idGenerator.nextId(),
      name,
      pattern,
      now: this.clock.now(),
    });

    await this.filterRepository.createFilter(filter);
    return filter;
  }

  async deleteFilter(id: string): Promise<void> {
    await this.filterRepository.deleteFilter(id);
  }
}
