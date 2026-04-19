import { asComparable, TaskDefinitionFields } from "../task-definition";
import { compareTaskDefinitions } from "../task-definition-diff";

describe("compareTaskDefinitions", () => {
  it("produces Modified diffs for values that differ between comparable task definitions", () => {
    const current: TaskDefinitionFields = {
      family: "web-app",
      networkMode: "awsvpc",
      cpu: "256",
      memory: "512",
      containerDefinitions: [
        {
          name: "web",
          image: "nginx:1.20",
          environment: [{ name: "NODE_ENV", value: "development" }],
        },
      ],
      tags: [{ key: "Environment", value: "dev" }],
    };
    const target: TaskDefinitionFields = {
      family: "web-app-v2",
      networkMode: "bridge",
      cpu: "512",
      memory: "1024",
      containerDefinitions: [
        {
          name: "web",
          image: "nginx:1.21",
          environment: [{ name: "NODE_ENV", value: "production" }],
        },
      ],
      tags: [{ key: "Environment", value: "prod" }],
    };

    const diffs = compareTaskDefinitions(asComparable(current), asComparable(target));

    expect(diffs).toEqual(
      expect.arrayContaining([
        { path: "family", current: "web-app", target: "web-app-v2", type: "Modified" },
        { path: "networkMode", current: "awsvpc", target: "bridge", type: "Modified" },
        { path: "cpu", current: "256", target: "512", type: "Modified" },
        { path: "memory", current: "512", target: "1024", type: "Modified" },
        {
          path: "containerDefinitions.web.image",
          current: "nginx:1.20",
          target: "nginx:1.21",
          type: "Modified",
        },
        {
          path: "containerDefinitions.web.environment.NODE_ENV",
          current: "development",
          target: "production",
          type: "Modified",
        },
        {
          path: "tags.Environment",
          current: "dev",
          target: "prod",
          type: "Modified",
        },
      ]),
    );
    expect(diffs.every((d) => d.type === "Modified")).toBe(true);
  });

  it("classifies non-matching container / volume entries as Added and Removed", () => {
    const current: TaskDefinitionFields = {
      family: "svc",
      containerDefinitions: [{ name: "old-container", image: "nginx:1.20" }],
      volumes: [{ name: "old-volume" }],
    };
    const target: TaskDefinitionFields = {
      family: "svc",
      containerDefinitions: [{ name: "new-container", image: "nginx:1.21" }],
      volumes: [{ name: "new-volume" }],
    };

    const diffs = compareTaskDefinitions(asComparable(current), asComparable(target));

    expect(diffs).toEqual(
      expect.arrayContaining([
        {
          path: "containerDefinitions.old-container.name",
          current: "old-container",
          target: undefined,
          type: "Removed",
        },
        {
          path: "containerDefinitions.new-container.name",
          current: undefined,
          target: "new-container",
          type: "Added",
        },
        {
          path: "volumes.old-volume.name",
          current: "old-volume",
          target: undefined,
          type: "Removed",
        },
        {
          path: "volumes.new-volume.name",
          current: undefined,
          target: "new-volume",
          type: "Added",
        },
      ]),
    );
  });

  it("returns no diffs when both sides are structurally equal", () => {
    const same: TaskDefinitionFields = {
      family: "svc",
      cpu: "256",
      memory: "512",
      containerDefinitions: [
        {
          name: "web",
          image: "nginx:1.20",
          environment: [{ name: "NODE_ENV", value: "production" }],
        },
      ],
    };

    const diffs = compareTaskDefinitions(asComparable(same), asComparable(same));

    expect(diffs).toEqual([]);
  });
});
