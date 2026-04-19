import { Clock } from "../usecase/port/clock";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
