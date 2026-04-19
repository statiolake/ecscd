import {
  FilterDomain,
  FilterValidationError,
  create as createFilterDomain,
} from "../domain/filter";
import { FilterRepository } from "../repository/filter";
import { Clock } from "./port/clock";
import { IdGenerator } from "./port/id-generator";

export interface CreateFilterCommand {
  name: string;
  pattern: string;
}

export type CreateFilterResult =
  | { type: "Created"; filter: FilterDomain }
  | { type: "Invalid"; errors: FilterValidationError[] };

export interface IFilterUsecase {
  getFilters(): Promise<FilterDomain[]>;
  getFilterById(id: string): Promise<FilterDomain | null>;
  createFilter(command: CreateFilterCommand): Promise<CreateFilterResult>;
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

  async createFilter(command: CreateFilterCommand): Promise<CreateFilterResult> {
    const validation = createFilterDomain({
      id: this.idGenerator.nextId(),
      name: command.name,
      pattern: command.pattern,
      now: this.clock.now(),
    });
    if (!validation.ok) {
      return { type: "Invalid", errors: validation.errors };
    }
    await this.filterRepository.createFilter(validation.filter);
    return { type: "Created", filter: validation.filter };
  }

  async deleteFilter(id: string): Promise<void> {
    await this.filterRepository.deleteFilter(id);
  }
}
