import { z } from "zod";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const DEFAULT_MIN_CONFIDENCE_SCORE = 0.6;

const RawServerEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GOOGLE_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).optional(),
  GEMINI_MIN_CONFIDENCE_SCORE: z.string().trim().optional(),
});

export type ServerEnv = {
  geminiApiKey: string;
  geminiModel: string;
  minimumConfidenceScore: number;
};

export function readServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsedEnv = RawServerEnvSchema.parse(env);
  const geminiApiKey = parsedEnv.GEMINI_API_KEY ?? parsedEnv.GOOGLE_API_KEY;

  if (!geminiApiKey) {
    throw new Error(
      "Set GEMINI_API_KEY or GOOGLE_API_KEY to enable server-side Gemini mapping.",
    );
  }

  return {
    geminiApiKey,
    geminiModel: parsedEnv.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
    minimumConfidenceScore: parseMinimumConfidenceScore(
      parsedEnv.GEMINI_MIN_CONFIDENCE_SCORE,
    ),
  };
}

function parseMinimumConfidenceScore(rawValue: string | undefined): number {
  if (rawValue === undefined) {
    return DEFAULT_MIN_CONFIDENCE_SCORE;
  }

  return z.coerce.number().min(0).max(1).parse(rawValue);
}
