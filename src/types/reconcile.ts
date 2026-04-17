import { z } from "zod";

const NonEmptyStringSchema = z.string().trim().min(1);
const CountryCodeSchema = z.string().trim().regex(/^[A-Z]{2}$/);
const CurrencyCodeSchema = z.string().trim().regex(/^[A-Z]{3}$/);
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const IsoDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

export const PayrollCategorySchema = z.enum([
  "earnings",
  "employee_taxes",
  "employer_taxes",
  "benefits",
  "net_pay",
]);

export const PayrollPartySideSchema = z.enum(["employee", "employer"]);

export const SupportedPayrollItemSchema = z.object({
  itemId: NonEmptyStringSchema,
  workerId: NonEmptyStringSchema,
  workerName: NonEmptyStringSchema,
  countryCode: CountryCodeSchema,
  currency: CurrencyCodeSchema,
  category: PayrollCategorySchema,
  code: NonEmptyStringSchema,
  label: NonEmptyStringSchema,
  amount: z.number().finite(),
});

export const SupportedPayrollFileSchema = z.object({
  payrollRunId: NonEmptyStringSchema,
  generatedAt: IsoDateTimeSchema,
  period: z.object({
    startDate: IsoDateSchema,
    endDate: IsoDateSchema,
  }),
  items: z.array(SupportedPayrollItemSchema).min(1),
});

export const NormalSideSchema = z.enum(["debit", "credit"]);
export const AccountTypeSchema = z.enum([
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const CoaCsvRowSchema = z.object({
  accountId: NonEmptyStringSchema,
  accountCode: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  type: AccountTypeSchema,
  normalSide: NormalSideSchema,
  aliases: NonEmptyStringSchema,
});

export const CoaEntrySchema = CoaCsvRowSchema.extend({
  aliases: z.array(NonEmptyStringSchema),
});

export const PayrollLineSchema = z.object({
  lineId: NonEmptyStringSchema,
  sourceRef: NonEmptyStringSchema,
  countryCode: CountryCodeSchema,
  currency: CurrencyCodeSchema,
  rawCode: NonEmptyStringSchema,
  rawLabel: NonEmptyStringSchema,
  normalizedCode: NonEmptyStringSchema,
  tokens: z.array(NonEmptyStringSchema).min(1),
  amount: z.number().finite(),
  section: PayrollCategorySchema,
  partySide: PayrollPartySideSchema,
});

export const ConfidenceBandSchema = z.enum(["low", "medium", "high"]);
export const JournalRoleSchema = z.enum(["expense", "liability"]);
export const MappingSourceSchema = z.enum(["model", "memory"]);
export const ReconcileLineStatusSchema = z.enum(["mapped", "anomaly"]);

export const ModelMatchedDecisionSchema = z.object({
  isAnomaly: z.literal(false),
  selectedAccountId: NonEmptyStringSchema,
  journalRole: JournalRoleSchema,
  confidenceScore: z.number().min(0).max(1),
  confidenceBand: ConfidenceBandSchema,
  reasoning: NonEmptyStringSchema,
});

export const ModelNoMatchDecisionSchema = z.object({
  isAnomaly: z.literal(true),
  selectedAccountId: z.null(),
  journalRole: z.null(),
  confidenceScore: z.number().min(0).max(1),
  confidenceBand: ConfidenceBandSchema,
  reasoning: NonEmptyStringSchema,
});

export const ModelMappingDecisionSchema = z.discriminatedUnion("isAnomaly", [
  ModelMatchedDecisionSchema,
  ModelNoMatchDecisionSchema,
]);

export const MappingDecisionSchema = z.object({
  normalizedCode: NonEmptyStringSchema,
  countryCode: CountryCodeSchema,
  selectedAccountId: NonEmptyStringSchema,
  selectedAccountCode: NonEmptyStringSchema.optional(),
  confidenceScore: z.number().min(0).max(1),
  confidenceBand: ConfidenceBandSchema,
  reasoning: NonEmptyStringSchema,
  journalRole: JournalRoleSchema,
  source: MappingSourceSchema.default("model"),
});

export const AnomalyReasonCodeSchema = z.enum([
  "no_candidate",
  "no_match",
  "low_confidence",
  "invalid_decision",
  "unsupported_input",
]);

export const AnomalySchema = z.object({
  lineId: NonEmptyStringSchema,
  normalizedCode: NonEmptyStringSchema,
  reasonCode: AnomalyReasonCodeSchema,
  reasoning: NonEmptyStringSchema,
  confidenceScore: z.number().min(0).max(1).optional(),
});

export const JournalRowSchema = z.object({
  currency: CurrencyCodeSchema,
  accountId: NonEmptyStringSchema,
  accountCode: NonEmptyStringSchema,
  accountName: NonEmptyStringSchema,
  side: NormalSideSchema,
  amount: z.number().finite(),
  memo: NonEmptyStringSchema,
});

export const MappedPayrollLineSchema = PayrollLineSchema.extend({
  status: z.literal("mapped"),
  selectedAccountId: NonEmptyStringSchema,
  selectedAccountCode: NonEmptyStringSchema,
  selectedAccountName: NonEmptyStringSchema,
  confidenceScore: z.number().min(0).max(1),
  confidenceBand: ConfidenceBandSchema,
  reasoning: NonEmptyStringSchema,
  journalRole: JournalRoleSchema,
  mappingSource: MappingSourceSchema,
});

export const AnomalousPayrollLineSchema = PayrollLineSchema.extend({
  status: z.literal("anomaly"),
  reasonCode: AnomalyReasonCodeSchema,
  reasoning: NonEmptyStringSchema,
  confidenceScore: z.number().min(0).max(1).optional(),
  confidenceBand: ConfidenceBandSchema.optional(),
});

export const ReconciledPayrollLineSchema = z.discriminatedUnion("status", [
  MappedPayrollLineSchema,
  AnomalousPayrollLineSchema,
]);

export const AuditTrailRowSchema = z.object({
  lineId: NonEmptyStringSchema,
  sourceRef: NonEmptyStringSchema,
  countryCode: CountryCodeSchema,
  currency: CurrencyCodeSchema,
  rawCode: NonEmptyStringSchema,
  rawLabel: NonEmptyStringSchema,
  normalizedCode: NonEmptyStringSchema,
  amount: z.number().finite(),
  status: ReconcileLineStatusSchema,
  selectedAccountCode: z.string(),
  selectedAccountName: z.string(),
  journalRole: z.string(),
  confidenceScore: z.number().min(0).max(1).optional(),
  confidenceBand: z.string().optional(),
  reasoning: NonEmptyStringSchema,
  anomalyReasonCode: z.string(),
});

export const ApprovalSchema = z.object({
  normalizedCode: NonEmptyStringSchema,
  countryCode: CountryCodeSchema,
  selectedAccountId: NonEmptyStringSchema,
  journalRole: JournalRoleSchema,
  confidenceScore: z.number().min(0).max(1),
  confidenceBand: ConfidenceBandSchema,
  rationale: NonEmptyStringSchema,
  status: z.literal("confirmed"),
  approvedAt: IsoDateTimeSchema,
});

export const ApprovalInputSchema = ApprovalSchema.omit({
  status: true,
  approvedAt: true,
});

export const ApprovalStoreSchema = z.array(ApprovalSchema);

export type SupportedPayrollFile = z.infer<typeof SupportedPayrollFileSchema>;
export type SupportedPayrollItem = z.infer<typeof SupportedPayrollItemSchema>;
export type PayrollLine = z.infer<typeof PayrollLineSchema>;
export type CoaCsvRow = z.infer<typeof CoaCsvRowSchema>;
export type CoaEntry = z.infer<typeof CoaEntrySchema>;
export type ModelMatchedDecision = z.infer<typeof ModelMatchedDecisionSchema>;
export type ModelNoMatchDecision = z.infer<typeof ModelNoMatchDecisionSchema>;
export type ModelMappingDecision = z.infer<typeof ModelMappingDecisionSchema>;
export type MappingDecision = z.infer<typeof MappingDecisionSchema>;
export type Anomaly = z.infer<typeof AnomalySchema>;
export type JournalRow = z.infer<typeof JournalRowSchema>;
export type MappedPayrollLine = z.infer<typeof MappedPayrollLineSchema>;
export type AnomalousPayrollLine = z.infer<typeof AnomalousPayrollLineSchema>;
export type ReconciledPayrollLine = z.infer<typeof ReconciledPayrollLineSchema>;
export type AuditTrailRow = z.infer<typeof AuditTrailRowSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
export type ApprovalInput = z.infer<typeof ApprovalInputSchema>;
export type ApprovalStore = z.infer<typeof ApprovalStoreSchema>;
