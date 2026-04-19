import { IdGenerator } from "../usecase/port/id-generator";

export class UuidGenerator implements IdGenerator {
  nextId(): string {
    return crypto.randomUUID();
  }
}
