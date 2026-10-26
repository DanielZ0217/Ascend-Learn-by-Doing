import { apiError, readJson } from "@/lib/ai/http";
import { coachTurn, createAssignment, customerTurn, learningRequestSchema } from "@/lib/ai/learning";
import { authenticate, isSharedCompany } from "@/lib/stage2/store";
import { learnerIdentity } from "@/lib/learner-preferences";

export async function POST(request: Request) {
  try {
    const input = learningRequestSchema.parse(await readJson(request));
    const participantId = isSharedCompany(input.blueprint.company.id)
      ? authenticate(request, input.blueprint.company.id).id : undefined;
    if (input.action === "create-assignment") return Response.json(await createAssignment(input));
    if (input.action === "coach") {
      const identity = learnerIdentity(request);
      const response = Response.json(await coachTurn(input, participantId, identity.key));
      if (identity.setCookie) response.headers.append("Set-Cookie", identity.setCookie);
      return response;
    }
    return Response.json(await customerTurn(input, participantId));
  } catch (error) {
    return apiError(error);
  }
}
