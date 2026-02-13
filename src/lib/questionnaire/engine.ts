import type { Question } from "./types";

export const ENGINE_VERSION = "m4-template-v1";

const DEFAULT_OPTIONS: Question["options"] = [
  { value: 1, label: "很差" },
  { value: 2, label: "差" },
  { value: 3, label: "可以接受" },
  { value: 4, label: "好" },
  { value: 5, label: "很好" },
];

export function generateTemplateQuestions(dayIndex: number): Question[] {
  const base: Array<{ id: string; title: string }> = [
    { id: "q_dust", title: "今天猫砂的粉尘表现如何？" },
    { id: "q_clump", title: "今天猫砂的结团牢固程度如何？" },
    { id: "q_odor", title: "今天的除臭效果如何？" },
    { id: "q_track", title: "今天带砂（带出猫砂）的情况如何？" },
    { id: "q_clean", title: "今天清理猫砂盆的难易程度如何？" },
  ];

  if (dayIndex >= 4) {
    base[4] = { id: "q_clean", title: "今天清理时的黏底/挂壁情况如何？" };
  }

  return base.map((q) => ({ ...q, options: DEFAULT_OPTIONS }));
}
