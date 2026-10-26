import { describe, expect, it } from "vitest";
import { roleIds, type Assignment, type CompanyBlueprint, type Review, type Submission } from "../../src/lib/contracts";
import {
  appendAssignment, appendSubmission, assignmentForRole, companyKey, createSession,
  nextAttempt, readBlueprint, readSession, resetSession, saveSession, sessionKey, turnsForChannel,
} from "../../src/lib/session/store";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
    removeItem: (key: string) => { items.delete(key); },
  };
}

const blueprint: CompanyBlueprint = {
  company: {
    id: "bank-1", preset: "bank", name: "Northstar Bank", description: "A local digital bank.",
    products: ["Checking account"], customerContext: "Customers depend on fast transfers.",
    employeeCount: 50, customerCount: 5000, roleIds: [...roleIds],
  },
  scenario: "A growing bank needs dependable service.",
  profiles: roleIds.map((roleId) => ({
    roleId, name: roleId, title: roleId, responsibility: "Teach the learner at work.",
    coachingStyle: "Patient and practical.", evaluationFocus: ["Accuracy"], starterTopics: ["An example task"],
  })),
};

const assignment: Assignment = {
  id: "a-1", companyId: "bank-1", roleId: "product-manager", kind: "written",
  goal: { roleId: "product-manager", topic: "Prioritize transfer alerts", difficulty: "beginner", entryMode: "task-first" },
  title: "Write an alert brief", brief: "Help customers understand delayed transfers.",
  responsePrompt: "Write a short product brief.",
  rubric: [{ id: "r-1", label: "Clarity", description: "Explain the user need clearly." }],
  sources: [],
};

function reviewFor(submissionId: string): Review {
  return { submissionId, criteria: [{ criterionId: "r-1", rating: "developing", evidence: "The need is partly stated.", explanation: "Add the affected user." }], strengths: ["Clear summary"], improvements: ["Identify the user"], nextSteps: ["Revise the brief"], sourceIds: [] };
}

describe("local learning session", () => {
  it("keeps a company's role drafts and earlier attempts after reload", () => {
    const storage = memoryStorage();
    storage.setItem(companyKey("bank-1"), JSON.stringify(blueprint));
    expect(readBlueprint(storage, "bank-1")?.company.name).toBe("Northstar Bank");
    let session = appendAssignment(createSession(blueprint), assignment);
    session = { ...session, drafts: { [assignment.id]: "First draft" }, activeRole: "software-engineer" };
    const first: Submission = { id: "s-1", assignmentId: assignment.id, attempt: 1, kind: "written", text: "First draft" };
    session = appendSubmission(session, first, reviewFor(first.id));
    expect(nextAttempt(session, assignment.id)).toEqual({ attempt: 2, previousSubmissionId: "s-1" });
    const second: Submission = { id: "s-2", assignmentId: assignment.id, attempt: 2, previousSubmissionId: "s-1", kind: "written", text: "Revised draft" };
    session = appendSubmission(session, second, reviewFor(second.id));
    saveSession(storage, session);
    const reloaded = readSession(storage, blueprint);
    expect(reloaded.drafts[assignment.id]).toBe("First draft");
    expect(reloaded.submissions.map((item) => item.attempt)).toEqual([1, 2]);
    expect(reloaded.reviews).toHaveLength(2);
    expect(assignmentForRole(reloaded, "product-manager")?.rubric).toEqual(assignment.rubric);
    expect(assignmentForRole(reloaded, "software-engineer")).toBeUndefined();
  });

  it("rejects corrupt storage and resets only practice state", () => {
    const storage = memoryStorage();
    storage.setItem(companyKey("bank-1"), JSON.stringify(blueprint));
    storage.setItem(sessionKey("bank-1"), "{broken json");
    expect(readSession(storage, blueprint).assignments).toEqual([]);
    saveSession(storage, appendAssignment(createSession(blueprint), assignment));
    resetSession(storage, "bank-1");
    expect(storage.getItem(sessionKey("bank-1"))).toBeNull();
    expect(readBlueprint(storage, "bank-1")?.company.id).toBe("bank-1");
  });

  it("keeps customer roleplay and mentor questions in separate conversations", () => {
    const base = { assignmentId: "a-1", timestamp: new Date().toISOString(), origin: "text" as const };
    const turns = [
      { ...base, id: "mentor-student-1", speaker: "student" as const, text: "Can you give me a hint?" },
      { ...base, id: "mentor-1", speaker: "mentor" as const, text: "Ask about the need first." },
      { ...base, id: "customer-student-1", speaker: "student" as const, text: "What do you need?" },
      { ...base, id: "customer-1", speaker: "customer" as const, text: "A quicker answer." },
    ];
    expect(turnsForChannel(turns, "mentor").map((turn) => turn.id)).toEqual(["mentor-student-1", "mentor-1"]);
    expect(turnsForChannel(turns, "customer").map((turn) => turn.id)).toEqual(["customer-student-1", "customer-1"]);
  });
});
