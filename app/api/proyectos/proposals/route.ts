import { isCampoSlug } from "@/lib/projects/campos";
import { createProposal, listProposals } from "@/lib/projects/proposal-store";
import { listCampos } from "@/lib/projects/service";
import {
  PROJECT_TIPOS,
  PROPOSAL_STATUSES,
  type ProjectTipo,
  type ProposalOriginType,
  type ProposalStatus,
} from "@/lib/projects/types";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { resolveUniverseKgSourceIds } from "@/lib/babel/universe-refs";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseStatus(value: string | null): ProposalStatus {
  if (value && PROPOSAL_STATUSES.includes(value as ProposalStatus)) {
    return value as ProposalStatus;
  }
  return "pending";
}

function parseOriginType(value: unknown): ProposalOriginType {
  const origin = String(value ?? "quick_create");
  if (origin === "purifier" || origin === "ai_chat" || origin === "quick_create") {
    return origin;
  }
  return "quick_create";
}

function parseTipo(value: unknown): ProjectTipo | undefined {
  const tipo = String(value ?? "");
  return PROJECT_TIPOS.includes(tipo as ProjectTipo) ? (tipo as ProjectTipo) : undefined;
}

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const status = parseStatus(request.nextUrl.searchParams.get("status"));
    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const allProposals = await listProposals({ status });

    if (!universeSlug) {
      return NextResponse.json({ proposals: allProposals, universe: "babel" });
    }

    const [campos, sourceIds] = await Promise.all([
      listCampos(universeSlug),
      resolveUniverseKgSourceIds(universeSlug),
    ]);
    const campoSlugs = new Set(campos.map((campo) => campo.slug));

    const proposals = allProposals.filter((proposal) => {
      if (
        proposal.suggestedCampoSlug &&
        campoSlugs.has(proposal.suggestedCampoSlug)
      ) {
        return true;
      }
      if (proposal.originRef && sourceIds.has(proposal.originRef)) {
        return true;
      }
      return false;
    });

    return NextResponse.json({ proposals, universe: universeSlug });
  } catch (error) {
    console.error("List proposals error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar las propuestas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      originContext?: string;
      originType?: string;
      originRef?: string;
      suggestedCampoSlug?: string;
      suggestedTipo?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "El título de la idea es obligatorio." },
        { status: 400 },
      );
    }

    const suggestedCampoSlug =
      body.suggestedCampoSlug && isCampoSlug(body.suggestedCampoSlug)
        ? body.suggestedCampoSlug
        : undefined;

    const proposal = await createProposal({
      title: body.title.trim(),
      description: body.description,
      originContext: body.originContext ?? "",
      originType: parseOriginType(body.originType),
      originRef: body.originRef,
      suggestedCampoSlug,
      suggestedTipo: parseTipo(body.suggestedTipo),
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error("Create proposal error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la propuesta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
