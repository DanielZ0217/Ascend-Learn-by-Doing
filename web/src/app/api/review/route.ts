import { apiError, readJson } from "@/lib/ai/http";
import { reviewRequestSchema, reviewSubmission } from "@/lib/ai/review";
import { authenticate, assertPracticeReviewAllowed, isSharedCompany, recordPracticeReview, recordReviewedTask, Stage2Error } from "@/lib/stage2/store";

export async function POST(request: Request) {
  try {
    const input = reviewRequestSchema.parse(await readJson(request));
    const participant = isSharedCompany(input.blueprint.company.id) ? authenticate(request, input.blueprint.company.id) : null;
    if (participant) assertPracticeReviewAllowed(participant, input.assignment);
    const result = await reviewSubmission(input);
    try {
      if (!participant) return Response.json(result);
      const body = input.submission.kind === "code" ? input.submission.code : input.submission.kind === "written"
        ? input.submission.text : input.submission.turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n");
      const completed = input.assignment.kind !== "code" || Boolean(input.runResult?.status === "completed"
        && input.runResult.checks.length === input.assignment.checks.length
        && input.runResult.checks.every((check) => check.passed));
      if (!recordPracticeReview(participant, input.assignment, body, result.review, completed))
        recordReviewedTask(participant, input.assignment, body, { completed, attempt: input.submission.attempt });
    } catch (error) {
      if (error instanceof Stage2Error) throw error;
      console.warn("Stage 2 review activity could not be recorded", error);
    }
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
