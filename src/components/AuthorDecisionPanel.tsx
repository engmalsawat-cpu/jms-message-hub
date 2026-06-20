import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Send, CheckCircle2 } from "lucide-react";

type Decision = "accept" | "minor_revision" | "major_revision" | "reject";

interface Props {
  paperId: string;
  paperTitle: string;
  authorId: string | null;
  journalId: string;
}

const decisionLabels = (isAr: boolean): Record<Decision, string> =>
  isAr
    ? { accept: "قبول", minor_revision: "تعديلات طفيفة", major_revision: "تعديلات جوهرية", reject: "رفض" }
    : { accept: "Accept", minor_revision: "Minor Revision", major_revision: "Major Revision", reject: "Reject" };

const decisionColors: Record<Decision, string> = {
  accept: "bg-green-100 text-green-800",
  minor_revision: "bg-yellow-100 text-yellow-800",
  major_revision: "bg-orange-100 text-orange-800",
  reject: "bg-red-100 text-red-800",
};

export function AuthorDecisionPanel({ paperId, paperTitle, authorId, journalId }: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const isEditor = hasAnyRole(["admin", "editor_in_chief", "managing_editor", "hq_admin"]);

  const [decision, setDecision] = useState<Decision | "">("");
  const [message, setMessage] = useState("");
  const [includeMap, setIncludeMap] = useState<Record<string, boolean>>({});

  const { data: journalStages = [] } = useQuery({
    queryKey: ["author-decision-stages", journalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("id, name_ar, name_en, stage_order, stage_type")
        .eq("journal_id", journalId)
        .order("stage_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!journalId && isEditor,
  });

  // Submitted review reports (for building the draft)
  const { data: reports = [] } = useQuery({
    queryKey: ["author-decision-reports", paperId],
    queryFn: async () => {
      const { data: rs, error } = await supabase
        .from("review_reports")
        .select("id, reviewer_id, recommendation, general_comments")
        .eq("paper_id", paperId)
        .eq("is_submitted", true)
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return rs || [];
    },
    enabled: !!paperId && isEditor,
  });

  // Previous decisions
  const { data: decisions = [] } = useQuery({
    queryKey: ["author-decisions", paperId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("author_decisions")
        .select("*")
        .eq("paper_id", paperId)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!paperId,
  });

  // Default include all reports when first loaded
  useEffect(() => {
    if (reports.length === 0) return;
    setIncludeMap((prev) => {
      const next = { ...prev };
      let changed = false;
      reports.forEach((r: any) => {
        if (!(r.id in next)) {
          next[r.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [reports]);

  const buildDraft = () => {
    const recLabels = isAr
      ? { accept: "قبول", minor_revision: "تعديلات طفيفة", major_revision: "تعديلات جوهرية", reject: "رفض" }
      : { accept: "Accept", minor_revision: "Minor Revision", major_revision: "Major Revision", reject: "Reject" };
    const selected = reports.filter((r: any) => includeMap[r.id] && (r.general_comments || "").trim());
    if (selected.length === 0) {
      toast.warning(isAr ? "اختر تقريراً واحداً على الأقل يحتوي على ملاحظات" : "Select at least one report with comments");
      return;
    }
    const blocks = selected.map((r: any, i: number) => {
      const rec = r.recommendation ? ` — ${recLabels[r.recommendation as Decision]}` : "";
      const header = isAr ? `ملاحظات المحكّم ${i + 1}${rec}:` : `Reviewer ${i + 1} comments${rec}:`;
      return `${header}\n${r.general_comments}`;
    });
    const intro = isAr
      ? `بحثكم بعنوان "${paperTitle}" تمت مراجعته من قِبل المحكّمين، وفيما يلي الملاحظات المعتمدة:\n\n`
      : `Your paper "${paperTitle}" has been reviewed. The approved feedback is below:\n\n`;
    setMessage(intro + blocks.join("\n\n"));
  };

  const sendDecision = useMutation({
    mutationFn: async () => {
      if (!decision || !message.trim()) throw new Error(isAr ? "الرجاء اختيار القرار وكتابة الرسالة" : "Pick a decision and write the message");

      const { error: dErr } = await supabase.from("author_decisions").insert({
        paper_id: paperId,
        prepared_by: user!.id,
        decision,
        unified_message: message.trim(),
      });
      if (dErr) throw dErr;

      // Auto-update paper status based on decision
      const statusMap: Record<Decision, string> = {
        accept: "accepted",
        minor_revision: "revision_required",
        major_revision: "revision_required",
        reject: "rejected",
      };
      const nextStage =
        decision === "accept"
          ? journalStages.find((stage: any) => stage.stage_type === "publication")
          : journalStages.find((stage: any) =>
              [stage.name_ar, stage.name_en].some((name) =>
                (name || "").toLowerCase().includes("final") || (name || "").includes("نهائي")
              )
            ) || journalStages[journalStages.length - 1];
      const paperUpdate: any = {
        status: statusMap[decision as Decision],
        updated_at: new Date().toISOString(),
      };
      if (nextStage?.id) paperUpdate.current_stage_id = nextStage.id;
      const { error: pErr } = await supabase
        .from("papers")
        .update(paperUpdate)
        .eq("id", paperId);
      if (pErr) throw pErr;

      // History entry
      await supabase.from("paper_stage_history").insert({
        paper_id: paperId,
        stage_id: nextStage?.id || null,
        action: "author_decision_sent",
        notes: `${decisionLabels(isAr)[decision as Decision]} — ${message.trim().slice(0, 200)}${message.length > 200 ? "..." : ""}`,
        performed_by: user!.id,
      });

      // Notify author
      if (authorId) {
        await supabase.from("notifications").insert({
          user_id: authorId,
          type: "author_decision",
          title_ar: "وصلكم قرار التحكيم",
          title_en: "Review decision received",
          body_ar: `بشأن البحث: ${paperTitle}`,
          body_en: `Regarding paper: ${paperTitle}`,
          metadata: { paper_id: paperId, decision },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["author-decisions", paperId] });
      queryClient.invalidateQueries({ queryKey: ["paper-history", paperId] });
      queryClient.invalidateQueries({ queryKey: ["paper", paperId] });
      queryClient.invalidateQueries({ queryKey: ["all-papers"] });
      queryClient.invalidateQueries({ queryKey: ["my-papers"] });
      toast.success(isAr ? "تم إرسال القرار والملاحظات للباحث" : "Decision and comments sent to author");
      setDecision("");
      setMessage("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const labels = decisionLabels(isAr);

  // Author view — show received decisions only
  if (!isEditor) {
    if (decisions.length === 0) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {isAr ? "قرار التحكيم والملاحظات" : "Review Decision & Comments"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {decisions.map((d: any) => (
            <div key={d.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={decisionColors[d.decision as Decision]}>{labels[d.decision as Decision]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(d.sent_at).toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap bg-muted rounded p-3">{d.unified_message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {isAr ? "إرسال قرار التحكيم للباحث" : "Send Review Decision to Author"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Previously sent */}
        {decisions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{isAr ? "القرارات المُرسلة سابقاً" : "Previously sent"}</p>
            {decisions.map((d: any) => (
              <div key={d.id} className="border rounded p-3 space-y-1 bg-muted/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <Badge className={decisionColors[d.decision as Decision]}>{labels[d.decision as Decision]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.sent_at).toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap line-clamp-3">{d.unified_message}</p>
              </div>
            ))}
            <Separator />
          </div>
        )}

        {/* Include which reports */}
        {reports.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{isAr ? "اختر تقارير المحكّمين التي توافق عليها" : "Select reviewer reports to include"}</p>
            <div className="space-y-2">
              {reports.map((r: any, i: number) => (
                <label key={r.id} className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={!!includeMap[r.id]}
                    onCheckedChange={(v) => setIncludeMap((prev) => ({ ...prev, [r.id]: !!v }))}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {isAr ? `محكّم ${i + 1}` : `Reviewer ${i + 1}`}
                      {r.recommendation && <span className="text-muted-foreground"> — {labels[r.recommendation as Decision]}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {r.general_comments || (isAr ? "لا توجد ملاحظات عامة" : "No general comments")}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={buildDraft}>
              {isAr ? "تجميع المسودة من المختارة" : "Build draft from selected"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا توجد تقارير محكّمين مُقدّمة بعد." : "No reviewer reports submitted yet."}
          </p>
        )}

        <Separator />

        <div className="space-y-2">
          <Label>{isAr ? "القرار النهائي" : "Final decision"}</Label>
          <Select value={decision} onValueChange={(v) => setDecision(v as Decision)}>
            <SelectTrigger>
              <SelectValue placeholder={isAr ? "اختر القرار" : "Choose decision"} />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(labels) as Decision[]).map((d) => (
                <SelectItem key={d} value={d}>{labels[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{isAr ? "الرسالة الموحَّدة للباحث" : "Unified message to author"}</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            placeholder={isAr ? "اكتب أو عدّل الملاحظات النهائية التي ستُرسل للباحث..." : "Write or edit the final comments to send to the author..."}
          />
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "سيتم إرسال إشعار داخلي للباحث. (البريد الإلكتروني يتطلب إعداد نطاق البريد أولاً.)"
              : "An in-app notification will be sent to the author. (Email requires email domain setup.)"}
          </p>
        </div>

        <Button
          className="w-full gap-2"
          disabled={!decision || !message.trim() || sendDecision.isPending}
          onClick={() => sendDecision.mutate()}
        >
          <Send className="h-4 w-4" />
          {sendDecision.isPending ? (isAr ? "جاري الإرسال..." : "Sending...") : isAr ? "إرسال للباحث" : "Send to author"}
        </Button>
      </CardContent>
    </Card>
  );
}