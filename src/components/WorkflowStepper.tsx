import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Stage = {
  id: string;
  name_ar: string;
  name_en: string;
  stage_order: number;
};

interface Props {
  stages: Stage[];
  currentStageId: string | null;
  status: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  revision_required: "bg-orange-100 text-orange-800",
  revised: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  published: "bg-emerald-100 text-emerald-800",
  withdrawn: "bg-gray-100 text-gray-800",
};

export function WorkflowStepper({ stages, currentStageId, status }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  if (!stages || stages.length === 0) return null;

  const currentIndex = stages.findIndex((s) => s.id === currentStageId);
  const isTerminal = status === "rejected" || status === "withdrawn";

  return (
    <Card>
      <CardContent className="pt-6 pb-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {isAr ? "مسار البحث" : "Paper Workflow"}
          </h2>
          <Badge className={statusColors[status] || ""}>
            {t(`papers.status.${status}`)}
          </Badge>
        </div>

        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {stages.map((stage, idx) => {
            const isCurrent = idx === currentIndex;
            const isCompleted = currentIndex >= 0 && idx < currentIndex;
            const isPending = currentIndex < 0 || idx > currentIndex;
            const dimmed = isTerminal && !isCompleted && !isCurrent;

            return (
              <div key={stage.id} className="flex items-start flex-1 min-w-[110px]">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                      isCompleted && "bg-primary border-primary text-primary-foreground",
                      isCurrent && "bg-primary/10 border-primary text-primary ring-4 ring-primary/15",
                      isPending && "bg-background border-muted text-muted-foreground",
                      dimmed && "opacity-50"
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-2 text-center leading-tight",
                      isCurrent ? "text-foreground font-semibold" : "text-muted-foreground",
                      dimmed && "opacity-50"
                    )}
                  >
                    {isAr ? stage.name_ar : stage.name_en}
                  </p>
                </div>
                {idx < stages.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mt-[18px] mx-1 min-w-[20px]",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}