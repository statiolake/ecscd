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

export type FilterValidationErrorField = "name" | "pattern";
export type FilterValidationErrorKind = "Empty" | "InvalidPattern";

export interface FilterValidationError {
  field: FilterValidationErrorField;
  kind: FilterValidationErrorKind;
}

export type CreateFilterDomainResult =
  | { ok: true; filter: FilterDomain }
  | { ok: false; errors: FilterValidationError[] };

export function create(input: CreateFilterInput): CreateFilterDomainResult {
  const errors: FilterValidationError[] = [];
  if (!input.name.trim()) {
    errors.push({ field: "name", kind: "Empty" });
  }
  if (!input.pattern.trim()) {
    errors.push({ field: "pattern", kind: "Empty" });
  } else {
    try {
      // eslint-disable-next-line no-new
      new RegExp(input.pattern);
    } catch {
      errors.push({ field: "pattern", kind: "InvalidPattern" });
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    filter: {
      id: input.id,
      name: input.name,
      pattern: input.pattern,
      createdAt: input.now,
      updatedAt: input.now,
    },
  };
}
