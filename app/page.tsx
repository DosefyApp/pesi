import { CalculatorPageClient } from "@/features/clinical-calculators/components/calculator-page-client";
import { calculatorManifest } from "@/features/clinical-calculators/manifests/manifest";

export default function Page() {
  return <CalculatorPageClient manifest={calculatorManifest} />;
}
