import { listLaboralChallenges } from "@/lib/laboral/challenges";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const challenges = await listLaboralChallenges();
    return NextResponse.json({ challenges });
  } catch (error) {
    console.error("List laboral challenges error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los retos laborales." },
      { status: 500 },
    );
  }
}
