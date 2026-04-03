import { describe, expect, it } from "vitest";
import { pesiEngine } from "@/features/clinical-calculators/engines/engine";

describe("pesiEngine", () => {
  it("classifica jovem estável como Classe I", () => {
    const parsed = pesiEngine.parse({
      modelType: "pesi",
      age: 32,
      heartRate: 88,
      systolicBloodPressure: 122,
      oxygenSaturation: 97,
      sex: "female",
      cancer: "no",
      heartFailure: "no",
      chronicLungDisease: "no",
      respiratoryRate: 18,
      temperature: 36.7,
      alteredMentalStatus: "no",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const result = pesiEngine.compute(parsed.data);
    expect(result.headline.status).toContain("Classe I");
  });

  it("classifica idoso com comorbidades em Classe III ou maior", () => {
    const parsed = pesiEngine.parse({
      modelType: "pesi",
      age: 78,
      heartRate: 112,
      systolicBloodPressure: 110,
      oxygenSaturation: 93,
      sex: "male",
      cancer: "yes",
      heartFailure: "yes",
      chronicLungDisease: "yes",
      respiratoryRate: 24,
      temperature: 36.5,
      alteredMentalStatus: "no",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const result = pesiEngine.compute(parsed.data);
    expect(result.headline.status).toMatch(/Classe (III|IV|V)/);
  });

  it("classifica paciente instável como Classe V", () => {
    const parsed = pesiEngine.parse({
      modelType: "pesi",
      age: 68,
      heartRate: 132,
      systolicBloodPressure: 82,
      oxygenSaturation: 84,
      sex: "male",
      cancer: "yes",
      heartFailure: "yes",
      chronicLungDisease: "yes",
      respiratoryRate: 36,
      temperature: 35.2,
      alteredMentalStatus: "yes",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const result = pesiEngine.compute(parsed.data);
    expect(result.headline.status).toContain("Classe V");
  });

  it("retorna sPESI baixo risco quando todos os critérios são negativos", () => {
    const parsed = pesiEngine.parse({
      modelType: "spesi",
      age: 54,
      heartRate: 90,
      systolicBloodPressure: 118,
      oxygenSaturation: 96,
      activeCancer: "no",
      chronicCardiopulmonaryDisease: "no",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(pesiEngine.compute(parsed.data).headline.value).toBe("0");
  });
});
