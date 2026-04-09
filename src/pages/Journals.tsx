import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export default function Journals() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const { data: journals, isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const statusLabel: Record<string, { ar: string; en: string; color: string }> = {
    active: { ar: "نشطة", en: "Active", color: "bg-green-100 text-green-800" },
    inactive: { ar: "غير نشطة", en: "Inactive", color: "bg-yellow-100 text-yellow-800" },
    archived: { ar: "مؤرشفة", en: "Archived", color: "bg-gray-100 text-gray-800" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("nav.journals")}</h1>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !journals?.length ? (
        <p className="text-muted-foreground">{t("common.noData")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {journals.map((j) => {
            const s = statusLabel[j.status] || statusLabel.active;
            return (
              <Card key={j.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 items-start">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{isAr ? j.title_ar : j.title_en}</CardTitle>
                        <CardDescription>{isAr ? j.title_en : j.title_ar}</CardDescription>
                      </div>
                    </div>
                    <Badge className={s.color}>{isAr ? s.ar : s.en}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {isAr ? j.description_ar : j.description_en}
                  </p>
                  {j.issn && (
                    <p className="text-xs text-muted-foreground">ISSN: {j.issn}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
