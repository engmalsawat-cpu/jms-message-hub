import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Save, Send, Loader2, FileText, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ReviewForm() {
  const { t, i18n } = useTranslation();
  const { requestId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAr = i18n.language === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  const [recommendation, setRecommendation] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [confidentialComments, setConfidentialComments] = useState("");
  const [scores, setScores] = useState<Record<string, { score: number; comment: string }>>({});
  const [reportFileUrl, setReportFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch review request with paper info
  const { data: request } = useQuery({
    queryKey: ["review-request", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_requests")
        .select("*, papers(title_ar, title_en, abstract_ar, abstract_en, journal_id, file_url, page_count, word_count, journals(title_ar, title_en))")
        .eq("id", requestId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });

  // Fetch criteria for the journal
  const { data: criteria = [] } = useQuery({
    queryKey: ["criteria", request?.papers?.journal_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select("*")
        .eq("journal_id", request!.papers!.journal_id)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!request?.papers?.journal_id,
  });

  // Fetch existing report
  const { data: existingReport } = useQuery({
    queryKey: ["review-report", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_reports")
        .select("*, criteria_scores(*)")
        .eq("review_request_id", requestId!)
        .eq("reviewer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!requestId && !!user,
  });

  // Initialize form from existing report
  useEffect(() => {
    if (existingReport) {
      setRecommendation(existingReport.recommendation || "");
      setGeneralComments(existingReport.general_comments || "");
      setConfidentialComments(existingReport.confidential_comments || "");
      setReportFileUrl((existingReport as any).report_file_url || null);
      const s: Record<string, { score: number; comment: string }> = {};
      (existingReport.criteria_scores || []).forEach((cs: any) => {
        s[cs.criteria_id] = { score: cs.score, comment: cs.comment || "" };
      });
      setScores(s);
    }
  }, [existingReport]);

  // Initialize scores for new criteria
  useEffect(() => {
    if (criteria.length > 0 && !existingReport) {
      const s: Record<string, { score: number; comment: string }> = {};
      criteria.forEach((c: any) => {
        if (!scores[c.id]) s[c.id] = { score: 0, comment: "" };
      });
      if (Object.keys(s).length > 0) setScores((prev) => ({ ...s, ...prev }));
    }
  }, [criteria, existingReport]);

  const saveMutation = useMutation({
    mutationFn: async (submit: boolean) => {
      let reportId = existingReport?.id;

      if (reportId) {
        // Update
        const { error } = await supabase
          .from("review_reports")
          .update({
            recommendation: recommendation || null,
            general_comments: generalComments || null,
            confidential_comments: confidentialComments || null,
            report_file_url: reportFileUrl,
            is_submitted: submit,
            submitted_at: submit ? new Date().toISOString() : null,
          } as any)
          .eq("id", reportId);
        if (error) throw error;

        // Delete old scores and re-insert
        await supabase.from("criteria_scores").delete().eq("review_report_id", reportId);
      } else {
        // Create
        const { data: report, error } = await supabase
          .from("review_reports")
          .insert({
            review_request_id: requestId!,
            paper_id: request!.paper_id,
            reviewer_id: user!.id,
            recommendation: recommendation || null,
            general_comments: generalComments || null,
            confidential_comments: confidentialComments || null,
            report_file_url: reportFileUrl,
            is_submitted: submit,
            submitted_at: submit ? new Date().toISOString() : null,
          } as any)
          .select()
          .single();
        if (error) throw error;
        reportId = report.id;
      }

      // Insert scores
      const scoreInserts = Object.entries(scores).map(([criteriaId, val]) => ({
        review_report_id: reportId!,
        criteria_id: criteriaId,
        score: val.score,
        comment: val.comment || null,
      }));
      if (scoreInserts.length > 0) {
        const { error } = await supabase.from("criteria_scores").insert(scoreInserts as any);
        if (error) throw error;
      }

      // Mark request as completed if submitting
      if (submit) {
        await supabase.from("review_requests").update({ status: "completed" } as any).eq("id", requestId!);
      }
    },
    onSuccess: (_, submit) => {
      queryClient.invalidateQueries({ queryKey: ["review-report", requestId] });
      queryClient.invalidateQueries({ queryKey: ["my-review-requests"] });
      if (submit) {
        toast.success(isAr ? "تم إرسال التقرير بنجاح" : "Report submitted successfully");
        navigate("/reviewer");
      } else {
        toast.success(isAr ? "تم حفظ المسودة" : "Draft saved");
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!request) return <p className="p-6 text-muted-foreground">{t("common.loading")}</p>;

  const recommendationOptions = [
    { value: "accept", label: isAr ? "قبول" : "Accept" },
    { value: "minor_revision", label: isAr ? "تعديلات طفيفة" : "Minor Revision" },
    { value: "major_revision", label: isAr ? "تعديلات جوهرية" : "Major Revision" },
    { value: "reject", label: isAr ? "رفض" : "Reject" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/reviewer")}>
          <BackArrow className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{isAr ? "نموذج التقييم" : "Evaluation Form"}</h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? request.papers?.title_ar : request.papers?.title_en}
          </p>
        </div>
      </div>

      {/* Paper Abstract & File */}
      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "ملخص البحث" : "Paper Abstract"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{isAr ? request.papers?.abstract_ar : request.papers?.abstract_en}</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {request.papers?.page_count != null && (
              <span>{isAr ? "عدد الصفحات:" : "Pages:"} {request.papers.page_count}</span>
            )}
            {request.papers?.word_count != null && (
              <span>{isAr ? "عدد الكلمات:" : "Words:"} {request.papers.word_count}</span>
            )}
          </div>
          {request.papers?.file_url && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const { data } = await supabase.storage.from("papers").createSignedUrl(request.papers!.file_url!, 3600);
                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                else toast.error(isAr ? "تعذر فتح الملف" : "Could not open file");
              }}
            >
              <FileText className="h-4 w-4" />
              {isAr ? "تحميل ملف البحث" : "Download Paper File"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Criteria Scoring */}
      {criteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? "معايير التقييم" : "Evaluation Criteria"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {criteria.map((c: any) => (
              <div key={c.id} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-base font-medium">{isAr ? c.name_ar : c.name_en}</Label>
                    {(isAr ? c.description_ar : c.description_en) && (
                      <p className="text-xs text-muted-foreground">{isAr ? c.description_ar : c.description_en}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {scores[c.id]?.score || 0}/{c.max_score}
                  </span>
                </div>
                <Slider
                  value={[scores[c.id]?.score || 0]}
                  onValueChange={([v]) => setScores((prev) => ({ ...prev, [c.id]: { ...prev[c.id], score: v } }))}
                  max={c.max_score}
                  step={1}
                  className="w-full"
                />
                <Textarea
                  placeholder={isAr ? "تعليق على هذا المعيار..." : "Comment on this criterion..."}
                  value={scores[c.id]?.comment || ""}
                  onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: { ...prev[c.id], comment: e.target.value } }))}
                  rows={2}
                />
                <Separator />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendation & Comments */}
      <Card>
        <CardHeader>
          <CardTitle>{isAr ? "التوصية والملاحظات" : "Recommendation & Comments"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{isAr ? "التوصية" : "Recommendation"}</Label>
            <Select value={recommendation} onValueChange={setRecommendation}>
              <SelectTrigger><SelectValue placeholder={isAr ? "اختر التوصية" : "Select recommendation"} /></SelectTrigger>
              <SelectContent>
                {recommendationOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "ملاحظات عامة (تظهر للباحث)" : "General Comments (visible to author)"}</Label>
            <Textarea value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label>{isAr ? "ملاحظات سرية (للمحرر فقط)" : "Confidential Comments (editor only)"}</Label>
            <Textarea value={confidentialComments} onChange={(e) => setConfidentialComments(e.target.value)} rows={3} />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>{isAr ? "ملف تقرير المحكم (اختياري)" : "Reviewer's Report File (optional)"}</Label>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "يمكنك رفع تقرير مفصل بصيغة PDF أو Word."
                : "Upload a detailed report (PDF or Word)."}
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !user) return;
                  setUploading(true);
                  const path = `${user.id}/reports/${requestId}-${Date.now()}-${file.name}`;
                  const { error } = await supabase.storage.from("papers").upload(path, file, { upsert: true });
                  setUploading(false);
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                  setReportFileUrl(path);
                  toast.success(isAr ? "تم رفع الملف" : "File uploaded");
                }}
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {reportFileUrl && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    const { data, error } = await supabase.storage.from("papers").download(reportFileUrl);
                    if (error || !data) {
                      toast.error(isAr ? "تعذر تحميل الملف" : "Could not download file");
                      return;
                    }
                    const url = URL.createObjectURL(data);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = reportFileUrl.split("/").pop() || "report";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4" />
                  {isAr ? "تحميل الملف الحالي" : "Download current file"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReportFileUrl(null)}
                >
                  {isAr ? "إزالة" : "Remove"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4" />
          {isAr ? "حفظ كمسودة" : "Save Draft"}
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={() => {
            if (!recommendation) {
              toast.error(isAr ? "يرجى اختيار التوصية" : "Please select a recommendation");
              return;
            }
            saveMutation.mutate(true);
          }}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isAr ? "إرسال التقرير" : "Submit Report"}
        </Button>
      </div>
    </div>
  );
}
