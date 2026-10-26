import { randomUUID } from "node:crypto";
import type { CompanyBlueprint, RoleId, Stage2Event } from "@/lib/contracts";

type EventSeed = { roleId: RoleId; issueKind: string; headline: string; detail: string; outcome: string; taskTopic: string };

const seeds: Record<CompanyBlueprint["company"]["preset"], EventSeed[]> = {
  bank: [
    { roleId: "customer-support", issueKind: "customer-request", headline: "A customer reports duplicate payment notices", detail: "A small business owner received two notices for one transfer and wants to know whether funds moved twice.", outcome: "Support logged the symptom and flagged the transaction for a clear explanation.", taskTopic: "clarify duplicate payment notifications and deduplicate retries" },
    { roleId: "software-engineer", issueKind: "reliability", headline: "Payment retries need a safer path", detail: "The payments queue retried an event after a timeout. Engineering needs to preserve the first valid record and avoid duplicate downstream work.", outcome: "Engineering isolated the retry path and proposed an idempotent handling rule.", taskTopic: "deduplicate payment retries while preserving arrival order" },
    { roleId: "data-analyst", issueKind: "analysis", headline: "Complaints rose this week", detail: "The support team wants a measured comparison of weekly complaint rates before changing the customer message.", outcome: "Analytics prepared a rate comparison and marked the cause as unconfirmed.", taskTopic: "analyze weekly complaint rates and explain uncertainty" },
    { roleId: "product-manager", issueKind: "feature-request", headline: "Customers need transfer status", detail: "Customers cannot tell whether a transfer is pending, complete, or needs attention.", outcome: "Product outlined a status view with plain-language acceptance criteria.", taskTopic: "prioritize a transfer status feature with acceptance criteria" },
    { roleId: "sales-marketing", issueKind: "customer-discovery", headline: "Small businesses ask about payment visibility", detail: "Prospective customers want to understand what status information the bank can actually provide before choosing an account.", outcome: "Growth collected discovery questions and kept unverified features out of its pitch.", taskTopic: "prepare discovery questions about payment visibility without unsupported claims" },
  ],
  restaurant: [
    { roleId: "customer-support", issueKind: "customer-request", headline: "A pickup guest received the wrong order", detail: "Two orders had similar names during a busy lunch rush; the guest needs a clear remedy and the team needs a better handoff.", outcome: "Support documented the mix-up and the missing order check.", taskTopic: "write a customer problem brief for pickup order accuracy" },
    { roleId: "software-engineer", issueKind: "reliability", headline: "Duplicate pickup orders reached the kitchen", detail: "A slow checkout response caused repeat taps and two order tickets for one purchase.", outcome: "Engineering mapped the duplicate order path for a safe fix.", taskTopic: "deduplicate pickup orders from repeat checkout requests" },
    { roleId: "sales-marketing", issueKind: "customer-discovery", headline: "Regular guests ask about the new menu", detail: "The team needs to understand which pickup options matter before promoting a seasonal menu.", outcome: "Growth collected customer questions and avoided unsupported claims.", taskTopic: "discover customer needs for a seasonal pickup menu" },
    { roleId: "product-manager", issueKind: "feature-request", headline: "Pickup timing is unclear", detail: "Guests need a reliable ready-time indicator without promising an exact minute the kitchen cannot guarantee.", outcome: "Product drafted a scoped pickup status change.", taskTopic: "prioritize a realistic pickup status feature" },
    { roleId: "data-analyst", issueKind: "analysis", headline: "Pickup accuracy varies by rush hour", detail: "Operations needs to compare incorrect-order rates by time window before changing the handoff process.", outcome: "Analytics prepared a rate breakdown and separated the pattern from an unproven cause.", taskTopic: "compare pickup order error rates by time window" },
  ],
  semiconductor: [
    { roleId: "customer-support", issueKind: "customer-request", headline: "A device maker asks for lot traceability", detail: "A customer found intermittent sensor failures and needs affected lot information without an invented root cause.", outcome: "Support recorded the affected lots, evidence, and open questions.", taskTopic: "write a traceability problem brief for an intermittent sensor issue" },
    { roleId: "software-engineer", issueKind: "reliability", headline: "Repeated test records obscure a yield report", detail: "Retried uploads added duplicate test records; the team needs one first-seen result per device ID.", outcome: "Engineering proposed a repeat-safe test-record import.", taskTopic: "deduplicate sensor test records by device ID" },
    { roleId: "data-analyst", issueKind: "analysis", headline: "Yield varies by production lot", detail: "Operations needs a lot-level summary before deciding whether to hold a shipment.", outcome: "Analytics separated measured lot rates from possible explanations.", taskTopic: "summarize production test results by lot and explain uncertainty" },
    { roleId: "product-manager", issueKind: "feature-request", headline: "Customers need a lot status report", detail: "The portal has no clear way to show which shipped lots are under review.", outcome: "Product scoped a status report with traceable acceptance criteria.", taskTopic: "define a customer-facing lot status feature" },
    { roleId: "sales-marketing", issueKind: "customer-discovery", headline: "A device maker plans a product launch", detail: "The prospective customer asks which sensor performance claims have verified test evidence and which remain assumptions.", outcome: "Growth documented technical questions without promising unverified yield or delivery dates.", taskTopic: "prepare evidence-based discovery questions for a device-maker launch" },
  ],
  software: [
    { roleId: "customer-support", issueKind: "customer-request", headline: "A team cannot find a missing request", detail: "A customer submitted a request but cannot tell whether it entered the workflow.", outcome: "Support captured the request ID and the customer's expected outcome.", taskTopic: "write a problem brief for missing request status" },
    { roleId: "software-engineer", issueKind: "reliability", headline: "A busy queue drops useful context", detail: "Traffic spiked and a downstream worker needs smaller ordered batches to keep requests moving.", outcome: "Engineering mapped a bounded batching change.", taskTopic: "batch requests during an overloaded queue" },
    { roleId: "product-manager", issueKind: "feature-request", headline: "Teams want a clearer workflow status", detail: "Users need one place to see whether a request is new, in progress, or blocked.", outcome: "Product prepared a focused status proposal.", taskTopic: "prioritize request status with testable acceptance criteria" },
    { roleId: "data-analyst", issueKind: "analysis", headline: "Queue delays rose after onboarding", detail: "The team needs a comparison of processing times before assuming that new customers caused the delay.", outcome: "Analytics summarized latency by period and flagged missing evidence.", taskTopic: "analyze queue processing delays with uncertainty" },
    { roleId: "sales-marketing", issueKind: "customer-discovery", headline: "A new team evaluates the workflow product", detail: "The prospective customer wants to know whether the current product fits its request process.", outcome: "Growth recorded discovery questions and avoided claiming unavailable features.", taskTopic: "discover customer workflow needs without unsupported claims" },
  ],
  custom: [
    { roleId: "customer-support", issueKind: "customer-request", headline: "A customer asks for a clearer next step", detail: "A customer has a problem with the core service and needs a specific, honest response.", outcome: "Support documented the issue and known facts.", taskTopic: "write a customer problem brief for the core service" },
    { roleId: "software-engineer", issueKind: "reliability", headline: "The core service sees repeat requests", detail: "Repeated requests may create duplicate work during a busy period.", outcome: "Engineering scoped a repeat-safe change.", taskTopic: "deduplicate repeated service requests" },
    { roleId: "product-manager", issueKind: "feature-request", headline: "Customers request a small improvement", detail: "The team needs a clear feature proposal tied to a real user need.", outcome: "Product outlined a minimal release with acceptance criteria.", taskTopic: "write a feature brief for the core service" },
    { roleId: "data-analyst", issueKind: "analysis", headline: "The team needs a baseline for service quality", detail: "Recent support reports suggest a problem, but the team needs a measured comparison before naming a cause.", outcome: "Analytics defined a baseline and marked remaining uncertainty.", taskTopic: "compare service quality measures before proposing a cause" },
    { roleId: "sales-marketing", issueKind: "customer-discovery", headline: "A prospective customer asks how the service fits", detail: "The team needs to learn the customer's current process before presenting a solution.", outcome: "Growth documented needs and limited its claims to known capabilities.", taskTopic: "prepare customer discovery questions for the core service" },
  ],
};

export function makeCompanyEvent(blueprint: CompanyBlueprint, sequence: number): Stage2Event {
  const options = seeds[blueprint.company.preset];
  const seed = options[(sequence - 1) % options.length];
  const maturity = blueprint.company.companyStage === "mature"
    ? "Coordinate the change with established operations and verify its effect before rollout."
    : "Work within a small team's capacity and ship the smallest reliable improvement.";
  return {
    id: randomUUID(), companyId: blueprint.company.id, sequence,
    roleId: seed.roleId, issueKind: seed.issueKind,
    headline: seed.headline, detail: `${seed.detail} ${maturity}`,
    outcome: seed.outcome, taskTopic: `${seed.taskTopic}. ${maturity}`,
    provenance: "simulated", createdAt: new Date().toISOString(),
  };
}
