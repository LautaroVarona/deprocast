import { importLaboralCsv } from "@/lib/laboral/challenges";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Se requiere un archivo CSV en el campo 'file'." },
        { status: 400 },
      );
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Solo se admiten archivos .csv exportados desde el Excel de control." },
        { status: 400 },
      );
    }

    const csvContent = await file.text();

    if (!csvContent.trim()) {
      return NextResponse.json(
        { error: "El archivo CSV está vacío." },
        { status: 400 },
      );
    }

    const result = await importLaboralCsv(csvContent);

    if (result.imported === 0 && result.errors.length > 0) {
      return NextResponse.json(
        {
          error: "No se pudo importar ningún reto.",
          details: result.errors,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Laboral CSV import error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo procesar el CSV.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
