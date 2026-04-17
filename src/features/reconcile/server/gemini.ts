import {
  ModelMappingDecisionSchema,
  type ModelMappingDecision,
} from "../../../types/reconcile";
import type { CandidateLookupConcept, RetrievalCandidate } from "./retrieval";

const MODEL_MAPPING_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    isAnomaly: { type: "boolean" },
    selectedAccountId: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    journalRole: {
      anyOf: [
        {
          type: "string",
          enum: ["expense", "liability"],
        },
        { type: "null" },
      ],
    },
    confidenceScore: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    confidenceBand: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    reasoning: { type: "string" },
  },
  required: [
    "isAnomaly",
    "selectedAccountId",
    "journalRole",
    "confidenceScore",
    "confidenceBand",
    "reasoning",
  ],
  additionalProperties: false,
} as const;

export type MapConceptInput = {
  concept: CandidateLookupConcept;
  candidates: readonly RetrievalCandidate[];
};

export type GeminiGenerateContentInput = {
  model: string;
  contents: string;
  config: {
    responseMimeType: "application/json";
    responseJsonSchema: typeof MODEL_MAPPING_RESPONSE_JSON_SCHEMA;
  };
};

export interface GeminiModelClient {
  models: {
    generateContent(
      input: GeminiGenerateContentInput,
    ): Promise<{ text: string | undefined }>;
  };
}

export interface GeminiMappingEngine {
  mapConcept(input: MapConceptInput): Promise<ModelMappingDecision>;
}

export type CreateGeminiMappingEngineOptions = {
  client: GeminiModelClient;
  model: string;
};

export function createGeminiMappingEngine(
  options: CreateGeminiMappingEngineOptions,
): GeminiMappingEngine {
  return {
    async mapConcept(input: MapConceptInput): Promise<ModelMappingDecision> {
      const response = await options.client.models.generateContent({
        model: options.model,
        contents: buildMappingPrompt(input),
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: MODEL_MAPPING_RESPONSE_JSON_SCHEMA,
        },
      });

      return parseModelMappingResponse(response.text, input.candidates);
    },
  };
}

function buildMappingPrompt(input: MapConceptInput): string {
  return [
    "Map the payroll concept to exactly one candidate GL account or return an anomaly.",
    "Choose only from the candidate accounts provided below.",
    "Do not invent account IDs, account codes, or account names.",
    "Set isAnomaly to true only when none of the candidates is a defensible match.",
    "Keep the reasoning concise and specific to the concept.",
    "",
    "Payroll concept:",
    JSON.stringify(input.concept, null, 2),
    "",
    "Candidate accounts:",
    JSON.stringify(input.candidates, null, 2),
  ].join("\n");
}

function parseModelMappingResponse(
  rawText: string | undefined,
  candidates: readonly RetrievalCandidate[],
): ModelMappingDecision {
  if (!rawText || rawText.trim() === "") {
    throw new Error("Gemini returned an empty mapping response.");
  }

  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(rawText);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  const decision = ModelMappingDecisionSchema.parse(parsedResponse);

  if (
    !decision.isAnomaly &&
    !candidates.some((candidate) => candidate.accountId === decision.selectedAccountId)
  ) {
    throw new Error(
      `Gemini selected account ${decision.selectedAccountId} outside the candidate shortlist.`,
    );
  }

  return decision;
}
