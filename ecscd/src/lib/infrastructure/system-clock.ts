import { Clock } from "./interface/clock";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
