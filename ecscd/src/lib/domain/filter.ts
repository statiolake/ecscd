export interface FilterDomain {
  id: string;
  name: string;
  pattern: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFilterInput {
  id: string;
  name: string;
  pattern: string;
  now: Date;
}

export function create(input: CreateFilterInput): FilterDomain {
  return {
    id: input.id,
    name: input.name,
    pattern: input.pattern,
    createdAt: input.now,
    updatedAt: input.now,
  };
}
