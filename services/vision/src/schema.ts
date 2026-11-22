import { z } from "zod";

export const InspectRequest = z.object({
  frameId: z.string().min(1).max(200),
  imageDataUrl: z.string().min(1),
  question: z.string().trim().min(1).max(1000),
  /** Optional (additive): which published guide to use. Default guide when absent. */
  guideId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/).optional(),
  /** Optional (additive): the founder-published guide's markdown, sent by the Wasp proxy. Takes precedence over guideId. */
  guideText: z.string().trim().min(1).max(20000).optional(),
});
export type InspectRequest = z.infer<typeof InspectRequest>;

export interface Target { x: number; y: number; width: number; height: number }
export type InspectResponse =
  | { frameId: string; status: "point"; instruction: string; target: Target }
  | { frameId: string; status: "unclear" | "done"; instruction: string; target: null };

/** Grid the model reports coordinates on (integers 0..GRID over the full image). Converted to fractions server-side. */
export const GRID = 1000;

/** JSON Schema sent to the Responses API (strict mode: every property required, nullable where optional). */
export const MODEL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "instruction", "visible_label", "success_evidence", "target"],
  properties: {
    status: { type: "string", enum: ["point", "unclear", "done"] },
    instruction: { type: "string" },
    visible_label: { type: ["string", "null"] },
    success_evidence: { type: ["string", "null"] },
    target: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["x", "y", "width", "height"],
      properties: {
        x: { type: "integer" },
        y: { type: "integer" },
        width: { type: "integer" },
        height: { type: "integer" },
      },
    },
  },
} as const;

const ModelOutput = z.object({
  status: z.enum(["point", "unclear", "done"]),
  instruction: z.string(),
  visible_label: z.string().nullable(),
  success_evidence: z.string().nullable(),
  target: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).nullable(),
});

export class ModelOutputError extends Error {}

const MAX_INSTRUCTION_CHARS = 200;

/** Validates raw model JSON against the contract and returns the client response with the original frameId. */
export function validateModelOutput(raw: unknown, frameId: string): InspectResponse {
  const parsed = ModelOutput.safeParse(raw);
  if (!parsed.success) throw new ModelOutputError("Model output did not match schema.");
  const o = parsed.data;
  const instruction = o.instruction.trim();
  if (!instruction) throw new ModelOutputError("Empty instruction.");
  if (instruction.length > MAX_INSTRUCTION_CHARS) throw new ModelOutputError("Instruction too long for speech.");

  if (o.status === "point") {
    if (!o.target) throw new ModelOutputError("point requires a target.");
    const label = o.visible_label?.trim();
    if (!label) throw new ModelOutputError("point requires the control's visible label.");
    if (!instruction.toLowerCase().includes(label.toLowerCase()))
      throw new ModelOutputError("point instruction must use the control's visible label.");
    const { x, y, width, height } = o.target;
    if (![x, y, width, height].every((n) => Number.isFinite(n))) throw new ModelOutputError("Non-finite target.");
    if (width <= 0 || height <= 0) throw new ModelOutputError("Target must have positive size.");
    if (x < 0 || y < 0 || x + width > GRID || y + height > GRID) throw new ModelOutputError("Target not fully inside image.");
    const f = (n: number) => Math.round((n / GRID) * 10000) / 10000;
    return { frameId, status: "point", instruction, target: { x: f(x), y: f(y), width: f(width), height: f(height) } };
  }
  if (o.target !== null) throw new ModelOutputError(`${o.status} requires target: null.`);
  if (o.status === "done" && !o.success_evidence?.trim()) throw new ModelOutputError("done requires visible success evidence.");
  return { frameId, status: o.status, instruction, target: null };
}
