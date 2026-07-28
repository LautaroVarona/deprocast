import { coagulateHermeneuta } from "@/lib/hermeneuta/coagulate";
import {
  isNodeType,
  isRelationType,
  type NodeType,
  type RelationType,
} from "@/lib/kg/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const coagulateSchema = z.object({
  semanticText: z.string().trim().min(1, "La traducción semántica no puede estar vacía."),
  title: z.string().trim().max(200).optional(),
  originalFilename: z.string().optional(),
  nodes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        type: z.string().refine(isNodeType, "Tipo de nodo inválido."),
      }),
    )
    .max(64)
    .default([]),
  edges: z
    .array(
      z.object({
        fromName: z.string().trim().min(1).max(200),
        toName: z.string().trim().min(1).max(200),
        relationType: z
          .string()
          .refine(isRelationType, "Tipo de relación inválido."),
        context: z.string().trim().max(1000).default(""),
      }),
    )
    .max(128)
    .default([]),
});

/**
 * Coagulación HITL — único punto de escritura Prisma del Hermeneuta.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = await request.json();
    const parsed = coagulateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }

    const result = await coagulateHermeneuta({
      semanticText: parsed.data.semanticText,
      title: parsed.data.title,
      originalFilename: parsed.data.originalFilename,
      nodes: parsed.data.nodes.map((n) => ({
        name: n.name,
        type: n.type as NodeType,
      })),
      edges: parsed.data.edges.map((e) => ({
        fromName: e.fromName,
        toName: e.toName,
        relationType: e.relationType as RelationType,
        context: e.context,
      })),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Hermeneuta coagulate error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo coagular en el grafo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
