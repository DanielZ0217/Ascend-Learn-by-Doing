import { beforeEach, describe, expect, it, vi } from "vitest";
import { companyBlueprintSchema, reviewSchema, roleIds } from "../../../src/lib/contracts";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/graph", () => ({ recordCompanyGraph: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/ai/provider", () => ({
  completeWithFallback: vi.fn(),
  AiServiceError: class extends Error {
    constructor(public code: string, message: string, public status: number) { super(message); }
  },
}));

import { completeWithFallback } from "../../../src/lib/ai/provider";
import { createCompanyBlueprint, fixtureCompanyBlueprint } from "../../../src/lib/ai/company";
import { reviewSubmission } from "../../../src/lib/ai/review";

const mockedComplete = vi.mocked(completeWithFallback);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("company supervisor", () => {
  it("labels an unconfigured company as fixture and keeps exactly the five approved roles", async () => {
    mockedComplete.mockResolvedValue(null);
    const result = await createCompanyBlueprint({ preset: "bank", prompt: "A neighborhood bank", companyName: "First Harbor", employeeCount: 12, customerCount: 900, mode: "live" });
    expect(result.mode).toBe("fixture");
    expect(companyBlueprintSchema.safeParse(result.blueprint).success).toBe(true);
    expect(result.blueprint.company.name).toBe("First Harbor");
    expect(result.blueprint.company.roleIds).toEqual(roleIds);
    expect(new Set(result.blueprint.profiles.map((profile) => profile.roleId)).size).toBe(5);
    expect(mockedComplete).toHaveBeenCalledOnce();
  });

  it("rejects a model blueprint that duplicates one coach instead of inventing a sixth role", async () => {
    mockedComplete.mockResolvedValue(null);
    const sample = fixtureCompanyBlueprint({ preset: "software", prompt: "", companyName: undefined, employeeCount: undefined, customerCount: undefined, mode: "fixture" });
    mockedComplete.mockResolvedValue({
      value: {
        name: sample.company.name, industry: sample.company.industry, description: sample.company.description,
        products: sample.company.products, customerContext: sample.company.customerContext,
        scenario: sample.scenario,
        profiles: [...sample.profiles.slice(0, 4), sample.profiles[0]],
      },
      usage: { inputTokens: 100, outputTokens: 100, estimatedUsd: 0.001 },
    } as never);
    const result = await createCompanyBlueprint({ preset: "software", prompt: "Create a software company", companyName: undefined, employeeCount: undefined, customerCount: undefined, mode: "live" });
    expect(result.mode).toBe("fixture");
    expect(result.blueprint.profiles.map((profile) => profile.roleId)).toEqual(roleIds);
  });
});

describe("review integrity", () => {
  it("does not suggest fixing failed checks after every supplied code check passes in fixture mode", async () => {
    mockedComplete.mockResolvedValue(null);
    const blueprint = fixtureCompanyBlueprint({ preset: "bank", prompt: "", companyName: undefined, employeeCount: undefined, customerCount: undefined, mode: "fixture" });
    const assignment = {
      id: "task-pass", companyId: blueprint.company.id, roleId: "software-engineer" as const,
      goal: { roleId: "software-engineer" as const, topic: "dedupe", difficulty: "beginner" as const, entryMode: "task-first" as const },
      title: "Deduplicate transactions", brief: "Return the first record per ID.", kind: "code" as const, language: "javascript" as const,
      functionName: "dedupeTransactions", starterCode: "function dedupeTransactions(records) { return records; }",
      checks: [{ id: "duplicate", label: "Duplicate", args: [[{ id: "a" }, { id: "a" }]], expected: [{ id: "a" }] }],
      rubric: [
        { id: "correctness", label: "Correctness", description: "Pass public checks." },
        { id: "clarity", label: "Clarity", description: "Keep code readable." },
      ], sources: [],
    };
    const submission = { id: "submission-pass", assignmentId: assignment.id, attempt: 1, kind: "code" as const, code: "function dedupeTransactions(records) { const seen = new Set(); return records.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }); }" };
    const result = await reviewSubmission({ blueprint, assignment, submission, mode: "fixture", runResult: { status: "completed", checks: [{ id: "duplicate", passed: true, detail: "Passed" }], output: "", durationMs: 1 } });
    expect(result.review.criteria.find((criterion) => criterion.criterionId === "correctness")?.rating).toBe("meets");
    expect(result.review.criteria.find((criterion) => criterion.criterionId === "clarity")?.rating).toBe("developing");
    expect(result.review.improvements.join(" ")).not.toMatch(/failed|failing behavior/i);
    expect(result.review.nextSteps.join(" ")).toMatch(/edge case|time and space/i);
  });

  it("does not mark correctness as meets when executable checks fail", async () => {
    mockedComplete.mockResolvedValue(null);
    const blueprint = fixtureCompanyBlueprint({ preset: "bank", prompt: "", companyName: undefined, employeeCount: undefined, customerCount: undefined, mode: "fixture" });
    const assignment = {
      id: "task-1", companyId: blueprint.company.id, roleId: "software-engineer" as const,
      goal: { roleId: "software-engineer" as const, topic: "dedupe payments", difficulty: "beginner" as const, entryMode: "task-first" as const },
      title: "Fix duplicate transactions", brief: "Return the first occurrence of each transaction ID.",
      kind: "code" as const, language: "javascript" as const, functionName: "dedupeTransactions",
      starterCode: "function dedupeTransactions(records) { return records; }",
      checks: [{ id: "duplicate", label: "Duplicate", args: [[{ id: "a" }, { id: "a" }]], expected: [{ id: "a" }] }],
      rubric: [{ id: "correctness", label: "Correctness", description: "Pass the checks." }], sources: [],
    };
    const submission = { id: "submission-1", assignmentId: assignment.id, attempt: 1, kind: "code" as const, code: assignment.starterCode };
    mockedComplete.mockResolvedValue({ value: {
      criteria: [{ criterionId: "correctness", rating: "meets", evidence: "Looks fine.", explanation: "Works." }],
      strengths: ["Readable."], improvements: [], nextSteps: ["Try more cases."], sourceIds: ["fabricated-source"],
    }, usage: { inputTokens: 100, outputTokens: 100, estimatedUsd: 0.001 } } as never);
    const result = await reviewSubmission({ blueprint, assignment, submission, mode: "live", runResult: { status: "completed", checks: [{ id: "duplicate", passed: false, detail: "Expected one transaction." }], output: "", durationMs: 3 } });
    expect(result.mode).toBe("live");
    expect(result.review.criteria[0].rating).toBe("needs-work");
    expect(result.review.sourceIds).toEqual([]);
    expect(reviewSchema.safeParse(result.review).success).toBe(true);
  });
});
