import { readServerEnv } from "../../../lib/env/server";
import {
  createGeminiMappingEngine,
  type GeminiGenerateContentInput,
  type GeminiMappingEngine,
  type GeminiModelClient,
} from "./gemini";
import { createApprovalMemoryFromEnv, type ApprovalMemory } from "./memory";

export type RuntimeReconcileDependencies = {
  approvalMemory: ApprovalMemory;
  mappingEngine: GeminiMappingEngine;
  minimumConfidenceScore: number;
};

export function createRuntimeReconcileDependencies(): RuntimeReconcileDependencies {
  const env = readServerEnv();
  const client = createGeminiDeveloperApiClient(env.geminiApiKey);

  return {
    approvalMemory: createApprovalMemoryFromEnv(),
    mappingEngine: createGeminiMappingEngine({
      client,
      model: env.geminiModel,
    }),
    minimumConfidenceScore: env.minimumConfidenceScore,
  };
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function createGeminiDeveloperApiClient(apiKey: string): GeminiModelClient {
  return {
    models: {
      async generateContent(
        input: GeminiGenerateContentInput,
      ): Promise<{ text: string | undefined }> {
        const response = await fetch(getGenerateContentUrl(input.model, apiKey), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: input.contents }],
              },
            ],
            generationConfig: {
              responseMimeType: input.config.responseMimeType,
              responseJsonSchema: input.config.responseJsonSchema,
            },
          }),
        });
        const responseBody =
          (await response.json()) as GeminiGenerateContentResponse;

        if (!response.ok) {
          throw new Error(
            responseBody.error?.message ??
              `Gemini request failed with status ${response.status}.`,
          );
        }

        return {
          text: extractResponseText(responseBody),
        };
      },
    },
  };
}

function getGenerateContentUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function extractResponseText(
  responseBody: GeminiGenerateContentResponse,
): string | undefined {
  return responseBody.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .find((text): text is string => typeof text === "string" && text.length > 0);
}
