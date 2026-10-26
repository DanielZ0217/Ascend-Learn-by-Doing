import { describe, expect, it } from "vitest";
import { assignmentSchema, sourceExcerptSchema } from "../src/lib/contracts";

describe("external learning response validation", () => {
  it("returns a validation failure rather than throwing on a malformed source URL", () => {
    const input = { id: "source-1", title: "Documentation", url: "not a URL", excerpt: "Example source text", retrievedAt: "2026-10-24T12:00:00Z", provenance: "live" };
    expect(() => sourceExcerptSchema.safeParse(input)).not.toThrow();
    expect(sourceExcerptSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an assignment that silently switches away from the selected role", () => {
    const input = {
      id: "task-1", companyId: "company-1", roleId: "product-manager",
      goal: { roleId: "sales-marketing", topic: "Customer needs", difficulty: "beginner", entryMode: "task-first" },
      title: "Prioritize a customer problem", brief: "Write acceptance criteria for the supplied customer request.",
      rubric: [{ id: "clarity", label: "Clarity", description: "Describe an observable result." }],
      sources: [], kind: "written", responsePrompt: "Write your feature brief.",
    };
    expect(assignmentSchema.safeParse(input).success).toBe(false);
    expect(assignmentSchema.safeParse({ ...input, goal: { ...input.goal, roleId: "product-manager" } }).success).toBe(true);
  });
});
