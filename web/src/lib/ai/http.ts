import { ZodError } from "zod";
import { AiServiceError } from "./provider";
import { Stage2Error } from "@/lib/stage2/store";

export async function readJson(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 160_000) throw new AiServiceError("invalid_request", "Request is too large.", 413);
  try {
    return await request.json();
  } catch {
    throw new AiServiceError("invalid_request", "Send a valid JSON request.", 400);
  }
}

export function apiError(error: unknown) {
  if (error instanceof Stage2Error) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  if (error instanceof AiServiceError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: { code: "invalid_request", message: "Some fields are missing or invalid.", fields: error.issues.map((issue) => issue.path.join(".")).slice(0, 8) } }, { status: 400 });
  }
  return Response.json({ error: { code: "internal_error", message: "This request could not be completed. Try again." } }, { status: 500 });
}
