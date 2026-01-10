import { describe, expect, it } from "vitest";
import { NeoCard } from "../src";

describe("@4jp/design-system exports", () => {
  it("exposes NeoCard component", () => {
    expect(NeoCard).toBeDefined();
  });
});
