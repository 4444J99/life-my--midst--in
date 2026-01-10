import { describe, expect, it } from "vitest";
import * as Schema from "../src";

describe("@in-midst-my-life/schema exports", () => {
  it("exposes mask/epoch/stage schemas", () => {
    expect(Schema.MaskSchema).toBeDefined();
    expect(Schema.EpochSchema).toBeDefined();
    expect(Schema.StageSchema).toBeDefined();
  });
});
