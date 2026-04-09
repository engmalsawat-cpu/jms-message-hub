import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ArrowLeft, Clock, CheckCircle, FileText } from "lucide-react";

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

export default function PaperDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const isAr = i18n.language === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  const { data: paper, isLoading } = useQuery({
    queryKey: ["paper", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .select("*, journals(title_ar, title_en), workflow_stages(name_ar, name_en)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ["paper-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_stage_history")
        .select("*, workflow_stages(name_ar, name_en)")
        .eq("paper_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (!paper) return <p>{t("common.noData")}</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/my-papers">
          <Button variant="ghost" size="icon"><BackArrow className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{isAr ? paper.title_ar : paper.title_en}</h1>
        <Badge className={statusColors[paper.status] || ""}>{t(`papers.status.${paper.status}`)}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t("papers.titleAr")}</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold mb-2" dir="rtl">{paper.title_ar}</p>
            <p className="text-sm text-muted-foreground" dir="rtl">{paper.abstract_ar}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("papers.titleEn")}</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold mb-2" dir="ltr">{paper.title_en}</p>
            <p className="text-sm text-muted-foreground" dir="ltr">{paper.abstract_en}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{isAr ? "معلومات البحث" : "Paper Info"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("journals.title")}</span>
            <span>{isAr ? paper.journals?.title_ar : paper.journals?.title_en}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("papers.keywords")}</span>
            <div className="flex gap-1 flex-wrap justify-end">
              {paper.keywords?.map((k: string) => (
                <Badge key={k} variant="secondary">{k}</Badge>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isAr ? "المرحلة الحالية" : "Current Stage"}</span>
            <span>{paper.workflow_stages ? (isAr ? paper.workflow_stages.name_ar : paper.workflow_stages.name_en) : "-"}</span>
          </div>
          {paper.file_url && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("papers.file")}</span>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {isAr ? "عرض الملف" : "View File"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {history && history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{isAr ? "سجل المراحل" : "Stage History"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.map((h, i) => (
                <div key={h.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full p-1.5 bg-primary text-primary-foreground">
                      {i === history.length - 1 ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    {i < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="font-medium">{h.action}</p>
                    {h.workflow_stages && (
                      <p className="text-sm text-muted-foreground">
                        {isAr ? h.workflow_stages.name_ar : h.workflow_stages.name_en}
                      </p>
                    )}
                    {h.notes && <p className="text-sm text-muted-foreground mt-1">{h.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(h.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
