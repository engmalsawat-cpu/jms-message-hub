export interface DefaultStage {
  stage_order: number;
  stage_type: "screening" | "review" | "publication";
  name_en: string;
  name_ar: string;
}

export const DEFAULT_STAGES: DefaultStage[] = [
  { stage_order: 1, stage_type: "screening", name_en: "Initial Screening", name_ar: "الفحص الأولي" },
  { stage_order: 2, stage_type: "review",    name_en: "Peer Review",        name_ar: "التحكيم العلمي" },
  { stage_order: 3, stage_type: "review",    name_en: "Committee Vote",     name_ar: "تصويت اللجنة" },
  { stage_order: 4, stage_type: "review",    name_en: "Final Decision",     name_ar: "القرار النهائي" },
  { stage_order: 5, stage_type: "publication", name_en: "Publication",      name_ar: "النشر" },
];
