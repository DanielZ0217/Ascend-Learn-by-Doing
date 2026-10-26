import { randomUUID } from "node:crypto";
import { assignmentSchema, roleLabels, type Assignment, type CompanyBlueprint, type RoleId, type Stage2Settings } from "@/lib/contracts";
import { fixtureAssignment } from "@/lib/ai/learning";

export const practiceRoleLadder: RoleId[] = [
  "customer-support", "software-engineer", "product-manager", "data-analyst", "sales-marketing",
];

const industryFacts = {
  bank: { customer: "A customer saw two payment confirmations after retrying a transfer", feature: "a reliable payment status view that does not repeat a transaction", record: "payment events", metric: "duplicate confirmation reports" },
  restaurant: { customer: "A customer saw two pickup confirmations after retrying an order", feature: "a reliable pickup status view that does not repeat an order", record: "pickup order events", metric: "duplicate pickup reports" },
  software: { customer: "A client saw two job completion notices after retrying a request", feature: "a reliable job status view that does not repeat a request", record: "job events", metric: "duplicate completion reports" },
  semiconductor: { customer: "A customer saw two test completion notices for one device lot", feature: "a reliable device-lot status view that does not repeat a test record", record: "device test events", metric: "duplicate test reports" },
  custom: { customer: "A customer saw two completion notices after retrying a request", feature: "a reliable request status view that does not repeat an event", record: "service events", metric: "duplicate notice reports" },
} as const;

export function practiceScenario(blueprint: CompanyBlueprint, settings: Stage2Settings, size: number) {
  if (size < 2 || size > 5) throw new Error("Team Practice needs two to five students.");
  const facts = industryFacts[blueprint.company.preset];
  const stage = settings.companyStage === "mature"
    ? "Keep the existing service running; specify a controlled rollout and evidence before making customer claims."
    : "Keep the first change small enough for a startup team to ship and explain clearly.";
  const extension = size === 2 ? "Deliver the customer brief and a checked implementation."
    : size === 3 ? "Add a product decision with acceptance criteria."
      : size === 4 ? "Add a measured baseline and a careful success metric."
        : "Add a truthful customer message based on verified outcomes.";
  return {
    title: `${blueprint.company.name}: make customer status trustworthy`,
    customer: facts.customer,
    feature: facts.feature,
    record: facts.record,
    metric: facts.metric,
    context: `${facts.customer}. They need to know what actually happened with ${blueprint.company.products[0]}. The team has not yet confirmed whether the underlying work happened twice or only the notice did. Build ${facts.feature}. ${stage} ${extension}`,
    roles: practiceRoleLadder.slice(0, size),
  };
}

export function practiceAssignment(blueprint: CompanyBlueprint, settings: Stage2Settings, size: number, roleId: RoleId): Assignment {
  const scenario = practiceScenario(blueprint, settings, size);
  if (!scenario.roles.includes(roleId)) throw new Error("This role is outside the team scenario.");
  const goal = { roleId, topic: `customer status feature for ${scenario.record}`,
    difficulty: settings.companyStage === "mature" ? "intermediate" as const : "beginner" as const,
    entryMode: "task-first" as const };
  const base = fixtureAssignment(blueprint, roleId === "software-engineer" ? { ...goal, topic: `deduplicate ${scenario.record} for customer status` } : goal, []);
  const shared = `Shared customer issue: ${scenario.context}\n\nYour role: ${roleLabels[roleId]}. This is one part of a ${size}-student team task. Your own coach reviews your submission. Ask teammates in Team conversation when facts are missing.`;
  if (roleId === "software-engineer" && base.kind === "code") return assignmentSchema.parse({ ...base, id: randomUUID(), title: `Prevent repeat ${scenario.record}`,
    brief: `${shared}\n\nImplement the supplied deduplication function so the status feature keeps the first record for each ID in arrival order. Run the supplied checks. Read Support's reviewed customer brief before final submission; distinguish a duplicate notice from duplicate underlying work.`,
  });
  const specs: Record<Exclude<RoleId, "software-engineer">, { title: string; prompt: string; rubric: Assignment["rubric"] }> = {
    "customer-support": { title: "Write the customer problem brief", prompt: "Write a PRD-style brief for Engineering: customer quote, observed behavior, impact, what is known versus unknown, proposed outcome, and testable acceptance criteria. Do not claim the transaction or order actually happened twice without evidence.", rubric: [
      { id: "evidence", label: "Customer evidence", description: "Separates the observed duplicate notice from the unverified underlying event." },
      { id: "handoff", label: "Engineering handoff", description: "Explains the customer impact and a testable feature outcome." },
      { id: "clarity", label: "Clarity", description: "Uses a concise brief that a teammate can act on." },
    ] },
    "product-manager": { title: "Set the feature scope", prompt: "Choose the smallest useful status feature, define what is out of scope, and write three acceptance criteria. Explain the priority and rollout tradeoff for this company stage.", rubric: [
      { id: "scope", label: "Scope", description: "Defines the user problem, minimum feature, and exclusions." },
      { id: "acceptance", label: "Acceptance", description: "Gives measurable acceptance criteria and a rollout decision." },
    ] },
    "data-analyst": { title: "Measure duplicate reports", prompt: "Using the sample weekly counts, calculate the report rate each week, propose a baseline and success measure for the status change, and say what these numbers cannot prove about underlying duplicate work.", rubric: [
      { id: "calculation", label: "Calculation", description: "Computes rates from the supplied counts correctly." },
      { id: "interpretation", label: "Interpretation", description: "Separates trend, uncertainty, and a useful next measurement." },
    ] },
    "sales-marketing": { title: "Draft a truthful customer update", prompt: "Draft a concise customer-facing update that acknowledges the reported issue, describes only verified improvements, and offers a next step. Do not promise a fix, launch date, or outcome that the team has not verified.", rubric: [
      { id: "accuracy", label: "Accuracy", description: "Claims only outcomes supported by reviewed team work." },
      { id: "customer", label: "Customer value", description: "Uses clear, empathetic language and gives a useful next step." },
    ] },
  };
  const spec = specs[roleId as Exclude<RoleId, "software-engineer">];
  return assignmentSchema.parse({ id: randomUUID(), companyId: blueprint.company.id, roleId, goal, kind: "written",
    title: spec.title, brief: `${shared}\n\n${spec.prompt}`, responsePrompt: spec.prompt, rubric: spec.rubric, sources: [],
    ...(roleId === "data-analyst" ? { dataset: [
      { week: "1", requests: 80, reports: 11 }, { week: "2", requests: 104, reports: 15 },
      { week: "3", requests: 130, reports: 24 }, { week: "4", requests: 122, reports: 18 },
    ] } : {}),
  });
}
