import { IdGenerator } from "./interface/id-generator";

export class UuidGenerator implements IdGenerator {
  nextId(): string {
    return crypto.randomUUID();
  }
}
