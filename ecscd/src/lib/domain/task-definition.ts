export interface TaskDefinitionFields {
  family?: string;
  taskRoleArn?: string;
  executionRoleArn?: string;
  networkMode?: string;
  cpu?: string;
  memory?: string;
  requiresCompatibilities?: string[];
  containerDefinitions?: Record<string, unknown>[];
  volumes?: Record<string, unknown>[];
  placementConstraints?: Record<string, unknown>[];
  runtimePlatform?: Record<string, unknown>;
  tags?: Record<string, unknown>[];
  pidMode?: string;
  ipcMode?: string;
  ephemeralStorage?: Record<string, unknown>;
  proxyConfiguration?: Record<string, unknown>;
  inferenceAccelerators?: Record<string, unknown>[];
  [key: string]: unknown;
}

export type DesiredTaskDefinitionSpec = TaskDefinitionFields & {
  readonly __tag: "Desired";
};

export type ComparableTaskDefinition = TaskDefinitionFields & {
  readonly __tag: "Comparable";
};

export type TaskDefinitionValidationError =
  | { type: "MissingFamily" }
  | { type: "MissingContainerDefinitions" }
  | { type: "EmptyContainerDefinitions" };

export type ValidateDesiredResult =
  | { ok: true; spec: DesiredTaskDefinitionSpec }
  | { ok: false; errors: TaskDefinitionValidationError[] };

export function validateDesired(
  fields: TaskDefinitionFields,
): ValidateDesiredResult {
  const errors: TaskDefinitionValidationError[] = [];
  if (typeof fields.family !== "string" || !fields.family.trim()) {
    errors.push({ type: "MissingFamily" });
  }
  if (!Array.isArray(fields.containerDefinitions)) {
    errors.push({ type: "MissingContainerDefinitions" });
  } else if (fields.containerDefinitions.length === 0) {
    errors.push({ type: "EmptyContainerDefinitions" });
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, spec: fields as DesiredTaskDefinitionSpec };
}

export function asComparable(
  fields: TaskDefinitionFields,
): ComparableTaskDefinition {
  return fields as ComparableTaskDefinition;
}

// ユーザーが宣言した desired spec は AWS 生成フィールドを含まない前提なので、
// そのまま比較対象としても解釈できる。branded type 上の変換のみ。
export function desiredToComparable(
  desired: DesiredTaskDefinitionSpec,
): ComparableTaskDefinition {
  return desired as unknown as ComparableTaskDefinition;
}
