import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import type { Assignment, Review, RoleId } from "../../../src/lib/contracts";

vi.mock("server-only", () => ({}));

import { fixtureCompanyBlueprint } from "../../../src/lib/ai/company";
import { practiceScenario } from "../../../src/lib/stage2/practice";
import { assertPracticeReviewAllowed, clearCompanyDemo, createSharedCompany, getPracticeTask,
  joinSharedCompanyByCode, listParticipants, previewPracticeTask, reassignPracticePart,
  recordPracticeReview, setActiveRole, startPracticeTask } from "../../../src/lib/stage2/store";

const opened: DatabaseSync[] = [];
afterEach(() => { for (const db of opened.splice(0)) db.close(); });

function team(size: number, preset: "bank" | "restaurant" | "software" | "semiconductor" | "custom" = "bank") {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE documents (id TEXT PRIMARY KEY, company_id TEXT);
    CREATE TABLE passages (id TEXT PRIMARY KEY, company_id TEXT);
    CREATE VIRTUAL TABLE passages_fts USING fts5(id UNINDEXED, text);`);
  opened.push(db);
  const settings = { participantMode: "collaborative" as const, experienceMode: "practice" as const,
    companyStage: "startup" as const, prompt: "A workplace", approvalMode: false, generationMode: "fixture" as const };
  const blueprint = fixtureCompanyBlueprint({ preset, prompt: "A workplace", mode: "fixture",
    participantMode: "collaborative", experienceMode: "practice", companyStage: "startup" });
  const created = createSharedCompany({ blueprint, creatorName: "Student 1", settings }, db);
  const people = [created.participant];
  for (let index = 2; index <= size; index++)
    people.push(joinSharedCompanyByCode({ joinCode: created.joinCode, displayName: `Student ${index}` }, db).participant);
  return { db, settings, blueprint, created, people };
}

function reviewed(assignment: Assignment): Review {
  return { submissionId: crypto.randomUUID(), criteria: assignment.rubric.map((criterion) => ({
    criterionId: criterion.id, rating: "developing", evidence: "The submitted work addresses this criterion.",
    explanation: "The student can refine the details further.",
  })), strengths: [], improvements: [], nextSteps: ["Try one more edge case."], sourceIds: [] };
}

describe("collaborative Practice team task", () => {
  it("offers one company-specific scenario for each present team size and freezes distinct roles", () => {
    const presets = ["bank", "restaurant", "software", "semiconductor", "custom"] as const;
    for (let size = 2; size <= 5; size++) {
      const { db, blueprint, created, people } = team(size, presets[size - 2]);
      const preview = previewPracticeTask(created.participant, db)!;
      expect(preview.status).toBe("preview");
      expect(preview.teamSize).toBe(size);
      expect(preview.context).toContain(blueprint.company.products[0]);
      expect(() => startPracticeTask(created.participant, db)).toThrow(/distinct required role/i);
      const roles = practiceScenario(blueprint, { participantMode: "collaborative", experienceMode: "practice", companyStage: "startup", prompt: "", approvalMode: false }, size).roles;
      people.forEach((person, index) => setActiveRole(person, roles[index], db));
      const started = startPracticeTask(created.participant, db)!;
      expect(started.parts.map((part) => part.roleId)).toEqual(roles);
      expect(started.parts.map((part) => part.ownerId)).toEqual(people.map((person) => person.id));
      expect(started.parts.find((part) => part.roleId === "software-engineer")?.assignment.kind).toBe("code");
      expect(started.parts.every((part) => part.assignment.brief.includes("Shared customer issue"))).toBe(true);
    }
  });

  it("blocks final engineering work until Support's reviewed brief and then completes both parts", () => {
    const { db, created, people } = team(2);
    setActiveRole(people[0], "customer-support", db);
    setActiveRole(people[1], "software-engineer", db);
    previewPracticeTask(created.participant, db);
    const started = startPracticeTask(created.participant, db)!;
    const support = started.parts[0].assignment, engineering = started.parts[1].assignment;
    expect(() => assertPracticeReviewAllowed(people[1], engineering, db)).toThrow(/Support's reviewed/i);
    const brief = "The customer saw two payment notices, but we have not confirmed a second transfer. Investigate the event IDs, preserve the first status event, and show one trustworthy status per transfer.";
    expect(recordPracticeReview(people[0], support, brief, reviewed(support), true, db)).toBe(true);
    expect(getPracticeTask(people[0].companyId, db)?.parts[0].reviewedBody).toBe(brief);
    expect(assertPracticeReviewAllowed(people[1], engineering, db)).toBe(true);
    recordPracticeReview(people[1], engineering, engineering.kind === "code" ? engineering.starterCode : "", reviewed(engineering), true, db);
    expect(getPracticeTask(people[0].companyId, db)?.status).toBe("completed");
  });

  it("lets a present teammate take an absent member's unfinished part after switching roles and reset clears it", () => {
    const { db, created, people } = team(2);
    setActiveRole(people[0], "customer-support", db);
    setActiveRole(people[1], "software-engineer", db);
    previewPracticeTask(created.participant, db);
    const task = startPracticeTask(created.participant, db)!;
    const engineering = task.parts[1];
    expect(() => reassignPracticePart(people[0], engineering.id, db)).toThrow(/still here/i);
    db.prepare("UPDATE stage2_participants SET last_seen = 0 WHERE id = ?").run(people[1].id);
    expect(listParticipants(people[0].companyId, db)).toHaveLength(1);
    expect(() => reassignPracticePart(people[0], engineering.id, db)).toThrow(/Select software-engineer/i);
    setActiveRole(people[0], "software-engineer" as RoleId, db);
    expect(reassignPracticePart(people[0], engineering.id, db)?.parts[1].ownerId).toBe(people[0].id);
    clearCompanyDemo(people[0], db);
    expect(getPracticeTask(people[0].companyId, db)).toBeNull();
  });

  it("keeps Marketing's final message behind reviewed team outcomes", () => {
    const { db, created, people } = team(5, "restaurant");
    const roles: RoleId[] = ["customer-support", "software-engineer", "product-manager", "data-analyst", "sales-marketing"];
    people.forEach((person, index) => setActiveRole(person, roles[index], db));
    previewPracticeTask(created.participant, db);
    const task = startPracticeTask(created.participant, db)!;
    const marketing = task.parts[4].assignment;
    expect(() => assertPracticeReviewAllowed(people[4], marketing, db)).toThrow(/other reviewed team outcomes/i);
    const text = "The customer reported two notices for one pickup order. We confirmed the status display should keep the first event ID. Here is the reviewed scope, measured trend, and customer-safe next step for the team.";
    for (const [index, part] of task.parts.entries()) {
      if (index === 4) break;
      recordPracticeReview(people[index], part.assignment, part.assignment.kind === "code" ? part.assignment.starterCode : text,
        reviewed(part.assignment), true, db);
    }
    expect(assertPracticeReviewAllowed(people[4], marketing, db)).toBe(true);
    recordPracticeReview(people[4], marketing, text, reviewed(marketing), true, db);
    expect(getPracticeTask(people[0].companyId, db)?.status).toBe("completed");
  });
});
