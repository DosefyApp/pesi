import { z } from "zod";
import { buildEngine } from "@/features/clinical-calculators/engines/helpers";
import { formatInteger } from "@/features/clinical-calculators/utils";

const yesNoSchema = z.string().refine((value) => value === "yes" || value === "no", {
  message: "Selecione uma opção.",
});

const sexSchema = z.string().refine((value) => value === "male" || value === "female", {
  message: "Selecione uma opção.",
});

const modelTypeSchema = z.string().refine((value) => value === "pesi" || value === "spesi", {
  message: "Selecione a versão do escore.",
});

const schema = z.object({
  modelType: modelTypeSchema,
  age: z.coerce.number().int().min(18, "Informe idade entre 18 e 120 anos.").max(120, "Informe idade entre 18 e 120 anos."),
  heartRate: z.coerce.number().int().min(20, "Informe FC entre 20 e 250 bpm.").max(250, "Informe FC entre 20 e 250 bpm."),
  systolicBloodPressure: z.coerce.number().int().min(30, "Informe PAS entre 30 e 300 mmHg.").max(300, "Informe PAS entre 30 e 300 mmHg."),
  oxygenSaturation: z.coerce.number().int().min(30, "Informe SatO2 entre 30% e 100%.").max(100, "Informe SatO2 entre 30% e 100%."),
  sex: sexSchema.optional(),
  cancer: yesNoSchema.optional(),
  heartFailure: yesNoSchema.optional(),
  chronicLungDisease: yesNoSchema.optional(),
  respiratoryRate: z.coerce.number().int().min(0, "Informe FR entre 0 e 80 irpm.").max(80, "Informe FR entre 0 e 80 irpm.").optional(),
  temperature: z.coerce.number().min(25, "Informe temperatura entre 25 e 45 °C.").max(45, "Informe temperatura entre 25 e 45 °C.").optional(),
  alteredMentalStatus: yesNoSchema.optional(),
  activeCancer: yesNoSchema.optional(),
  chronicCardiopulmonaryDisease: yesNoSchema.optional(),
});

export const pesiEngine = buildEngine(schema, (values) => {
  const isSimplified = values.modelType === "spesi";

  if (isSimplified) {
    const components = [
      { label: "Idade > 80 anos", points: values.age > 80 ? 1 : 0 },
      { label: "Câncer ativo", points: values.activeCancer === "yes" ? 1 : 0 },
      {
        label: "Doença cardiopulmonar crônica",
        points: values.chronicCardiopulmonaryDisease === "yes" ? 1 : 0,
      },
      { label: "FC >= 110 bpm", points: values.heartRate >= 110 ? 1 : 0 },
      { label: "PAS < 100 mmHg", points: values.systolicBloodPressure < 100 ? 1 : 0 },
      { label: "SatO2 < 90%", points: values.oxygenSaturation < 90 ? 1 : 0 },
    ];

    const total = components.reduce((acc, item) => acc + item.points, 0);
    const positive = components.filter((item) => item.points > 0).map((item) => item.label);

    return {
      headline: {
        label: "sPESI",
        value: formatInteger(total),
        status: total === 0 ? "Baixo risco" : "Maior risco",
        tone: total === 0 ? "success" : "warning",
        description:
          total === 0
            ? "sPESI igual a zero, compatível com perfil de menor risco."
            : "sPESI maior ou igual a 1, compatível com maior risco e necessidade de maior vigilância.",
      },
      interpretation: {
        title: "Interpretação clínica",
        tone: total === 0 ? "success" : "warning",
        description:
          total === 0
            ? "Resultado compatível com baixo risco, podendo apoiar discussão sobre manejo ambulatorial em cenário apropriado."
            : "Resultado compatível com maior risco, favorecendo internação e avaliação mais próxima.",
        bullets: [
          "Decisão ambulatorial depende também de estabilidade hemodinâmica, suporte social, imagem e biomarcadores.",
        ],
      },
      calculation: {
        title: "Como foi calculado",
        rows: components.map((item) => ({
          label: item.label,
          value: `${item.points} ponto(s)`,
        })),
        bullets: [`Pontuação total do sPESI = ${total}.`],
      },
      extraPanels: [
        {
          title: "Critérios positivos",
          tone: total === 0 ? "info" : "warning",
          bullets: positive.length ? positive : ["Nenhum critério do sPESI ficou positivo."],
        },
      ],
    };
  }

  const components = [
    { label: "Idade", points: values.age },
    { label: "Sexo masculino", points: values.sex === "male" ? 10 : 0 },
    { label: "Câncer", points: values.cancer === "yes" ? 30 : 0 },
    { label: "Insuficiência cardíaca", points: values.heartFailure === "yes" ? 10 : 0 },
    { label: "Doença pulmonar crônica", points: values.chronicLungDisease === "yes" ? 10 : 0 },
    { label: "FC >= 110 bpm", points: values.heartRate >= 110 ? 20 : 0 },
    { label: "PAS < 100 mmHg", points: values.systolicBloodPressure < 100 ? 30 : 0 },
    { label: "FR >= 30 irpm", points: (values.respiratoryRate ?? 0) >= 30 ? 20 : 0 },
    { label: "Temperatura < 36 °C", points: (values.temperature ?? 99) < 36 ? 20 : 0 },
    { label: "Alteração mental", points: values.alteredMentalStatus === "yes" ? 60 : 0 },
    { label: "SatO2 < 90%", points: values.oxygenSaturation < 90 ? 20 : 0 },
  ];

  const total = components.reduce((acc, item) => acc + item.points, 0);
  let classLabel = "Classe I";
  let status = "Baixo risco";
  let tone: "success" | "warning" | "danger" = "success";
  let interpretation = "Classe I ou II, compatível com menor risco relativo e possível discussão sobre manejo ambulatorial em contexto apropriado.";

  if (total >= 66 && total <= 85) {
    classLabel = "Classe II";
  } else if (total >= 86 && total <= 105) {
    classLabel = "Classe III";
    status = "Maior risco";
    tone = "warning";
    interpretation = "Classe III, compatível com maior risco e necessidade frequente de internação.";
  } else if (total >= 106 && total <= 125) {
    classLabel = "Classe IV";
    status = "Alto risco";
    tone = "danger";
    interpretation = "Classe IV, compatível com TEP de maior gravidade e necessidade de observação hospitalar mais estreita.";
  } else if (total > 125) {
    classLabel = "Classe V";
    status = "Risco muito alto";
    tone = "danger";
    interpretation = "Classe V, compatível com risco muito alto e necessidade de internação com avaliação intensiva.";
  }

  const positive = components.filter((item) => item.points > 0 && item.label !== "Idade").map((item) => `${item.label}: +${item.points}`);

  return {
    headline: {
      label: "PESI completo",
      value: formatInteger(total),
      status: `${classLabel} • ${status}`,
      tone,
      description: "O PESI completo soma idade e marcadores clínicos associados à gravidade do TEP.",
    },
    interpretation: {
      title: "Interpretação clínica",
      tone,
      description: interpretation,
      bullets: [
        classLabel === "Classe I" || classLabel === "Classe II"
          ? "Classes I e II costumam sustentar discussão de manejo ambulatorial em pacientes selecionados."
          : "Classes III a V favorecem internação e monitorização mais próxima.",
      ],
    },
    calculation: {
      title: "Como foi calculado",
      rows: components.map((item) => ({
        label: item.label,
        value: `${item.points} ponto(s)`,
      })),
      bullets: [`Pontuação total do PESI = ${total}.`],
    },
    extraPanels: [
      {
        title: "Componentes adicionais de risco",
        tone,
        bullets: positive.length ? positive : ["Além da idade, nenhum componente adicional pontuou."],
      },
    ],
  };
});

export const calculatorEngine = pesiEngine;
