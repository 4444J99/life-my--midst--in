import { describe, expect, it } from "vitest";
import { parseGitHubEvent } from "../src/webhooks";

describe("parseGitHubEvent", () => {
  it("maps pull_request_review to reviewer role", () => {
    const task = parseGitHubEvent("pull_request_review", {
      action: "submitted",
      pull_request: { number: 7, title: "Add feature" },
      pull_request_review: { state: "approved" },
      repository: { full_name: "demo/repo" }
    });
    expect(task.role).toBe("reviewer");
    expect(task.description).toContain("review");
  });

  it("maps check_run to tester role", () => {
    const task = parseGitHubEvent("check_run", {
      action: "completed",
      check_run: { name: "ci", status: "completed", conclusion: "success" },
      repository: { full_name: "demo/repo" }
    });
    expect(task.role).toBe("tester");
    expect(task.description).toContain("Check run");
  });
});
