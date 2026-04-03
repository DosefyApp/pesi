import { NextResponse } from "next/server";
import { calculatorEngine } from "@/features/clinical-calculators/engines/engine";

export async function POST(request: Request) {
  const payload = (await request.json()) as unknown;
  const parsed = calculatorEngine.parse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Revise os campos destacados e tente novamente.",
        fieldErrors: parsed.fieldErrors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    result: calculatorEngine.compute(parsed.data),
  });
}
