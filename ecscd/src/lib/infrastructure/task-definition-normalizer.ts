import {
  asComparable,
  ComparableTaskDefinition,
  TaskDefinitionFields,
  ValidateDesiredResult,
  validateDesired,
} from "../domain/task-definition";

const AWS_GENERATED_TASK_DEFINITION_FIELDS = [
  "revision",
  "taskDefinitionArn",
  "registeredAt",
  "registeredBy",
  "status",
  "requiresAttributes",
  "compatibilities",
] as const;

function stripAwsGeneratedFields(
  raw: Record<string, unknown>,
): TaskDefinitionFields {
  const spec: Record<string, unknown> = { ...raw };

  for (const field of AWS_GENERATED_TASK_DEFINITION_FIELDS) {
    delete spec[field];
  }

  return spec as TaskDefinitionFields;
}

export function toDesiredTaskDefinitionSpec(
  raw: Record<string, unknown>,
): ValidateDesiredResult {
  return validateDesired(stripAwsGeneratedFields(raw));
}

export function toComparableTaskDefinition(
  raw: Record<string, unknown>,
): ComparableTaskDefinition {
  return asComparable(stripAwsGeneratedFields(raw));
}
