import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, Clock, CheckCircle, FileText,
  UserPlus, Send, MessageSquare, AlertTriangle, Star, Eye, ClipboardCheck, Vote
} from "lucide-react";
import { ReviewRequestsPanel } from "@/components/ReviewRequestsPanel";
import { CommitteeVotingPanel } from "@/components/CommitteeVotingPanel";

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

const statusFlow = [
  "submitted",
  "under_review",
  "revision_required",
  "revised",
  "accepted",
  "rejected",
  "published",
  "withdrawn",
];

type PaperUpdate = Database["public"]["Tables"]["papers"]["Update"];

export default function PaperDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user, hasAnyRole } = useAuth();
  const isAr = i18n.language === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;
  const queryClient = useQueryClient();
  const isEditor = hasAnyRole(["admin", "editor_in_chief", "managing_editor", "hq_admin"]);

  const downloadPaperFile = async (filePath: string) => {
    const { data, error } = await supabase.storage.from("papers").download(filePath);

    if (error || !data) {
      toast.error(isAr ? "تعذر فتح الملف" : "Could not open file");
      return;
    }

    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filePath.split("/").pop() || "paper-file";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [newStageId, setNewStageId] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState("editor");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState("");

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
        .select("*, workflow_stages(name_ar, name_en), profiles:performed_by(full_name)")
        .eq("paper_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: reviewReports = [] } = useQuery({
    queryKey: ["paper-review-reports", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_reports")
        .select("*, profiles:reviewer_id(full_name), criteria_scores(*, evaluation_criteria:criteria_id(name_ar, name_en, max_score))")
        .eq("paper_id", id!)
        .eq("is_submitted", true)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && isEditor,
  });

  const { data: paperRoles } = useQuery({
    queryKey: ["paper-roles", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_roles")
        .select("*, profiles:user_id(full_name, email)")
        .eq("paper_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && isEditor,
  });

  const { data: threads } = useQuery({
    queryKey: ["paper-threads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select("*, messages(id, body, sender_id, created_at, profiles:sender_id(full_name))")
        .eq("paper_id", id!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: journalStages = [] } = useQuery({
    queryKey: ["workflow-stages-for-paper", paper?.journal_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("id, name_ar, name_en, stage_order")
        .eq("journal_id", paper!.journal_id)
        .order("stage_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!paper && isEditor,
  });

  const { data: journalCommittees = [] } = useQuery({
    queryKey: ["committees-for-journal", paper?.journal_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committees")
        .select("id, name_ar, name_en")
        .eq("journal_id", paper!.journal_id)
        .order("name_ar", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!paper && isEditor,
  });

  const sendToCommittee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("committee_papers").insert({
        committee_id: selectedCommitteeId,
        paper_id: id!,
        status: "pending",
      });
      if (error) {
        // UNIQUE(committee_id, paper_id) violation → code 23505
        if (error.code === "23505") {
          throw new Error(
            isAr
              ? "هذا البحث محال مسبقاً إلى هذه اللجنة"
              : "This paper is already assigned to this committee"
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-papers", id] });
      toast.success(isAr ? "تم إرسال البحث إلى اللجنة" : "Paper sent to committee");
      setCommitteeDialogOpen(false);
      setSelectedCommitteeId("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const changeStatus = useMutation({
    mutationFn: async () => {
      const papersUpdate: PaperUpdate = { status: newStatus as PaperUpdate["status"] };
      if (newStageId) {
        papersUpdate.current_stage_id = newStageId;
      }

      const { error } = await supabase
        .from("papers")
        .update(papersUpdate)
        .eq("id", id!);
      if (error) throw error;

      await supabase.from("paper_stage_history").insert({
        paper_id: id!,
        stage_id: newStageId || null,
        action: `Status changed to ${newStatus}`,
        notes: statusNotes || null,
        performed_by: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper", id] });
      queryClient.invalidateQueries({ queryKey: ["paper-history", id] });
      toast.success(isAr ? "تم تحديث الحالة" : "Status updated");
      setStatusDialogOpen(false);
      setStatusNotes("");
      setNewStageId("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignReviewer = useMutation({
    mutationFn: async () => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", assignEmail)
        .single();
      if (pErr) throw new Error(isAr ? "لم يتم العثور على المستخدم" : "User not found");

      const { error } = await supabase.from("paper_roles").insert({
        paper_id: id!,
        user_id: profile.id,
        role: assignRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-roles", id] });
      toast.success(isAr ? "تم التعيين بنجاح" : "Assigned successfully");
      setAssignDialogOpen(false);
      setAssignEmail("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      let threadId: string;
      const existingThread = threads?.find((th) => th.thread_type === "editor_author");
      if (existingThread) {
        threadId = existingThread.id;
      } else {
        const participants = [user!.id];
        if (paper?.submitted_by && paper.submitted_by !== user!.id) {
          participants.push(paper.submitted_by);
        }
        const { data: newThread, error: tErr } = await supabase
          .from("threads")
          .insert({
            paper_id: id!,
            thread_type: "editor_author",
            subject: isAr ? `مراسلة بخصوص: ${paper?.title_ar}` : `Re: ${paper?.title_en}`,
            participants,
          })
          .select()
          .single();
        if (tErr) throw tErr;
        threadId = newThread.id;
      }

      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: user!.id,
        body: messageBody,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper-threads", id] });
      toast.success(isAr ? "تم إرسال الرسالة" : "Message sent");
      setMessageDialogOpen(false);
      setMessageBody("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-muted-foreground p-6">{t("common.loading")}</p>;
  if (!paper) return <p className="p-6">{t("common.noData")}</p>;

  const isAuthor = paper.submitted_by === user?.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={isEditor ? "/papers" : "/my-papers"}>
          <Button variant="ghost" size="icon"><BackArrow className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex-1">{isAr ? paper.title_ar : paper.title_en}</h1>
        <Badge className={statusColors[paper.status] || ""}>{t(`papers.status.${paper.status}`)}</Badge>
      </div>

      {/* Editor Actions */}
      {isEditor && (
        <div className="flex gap-2 flex-wrap">
          <Dialog open={statusDialogOpen} onOpenChange={(o) => {
            setStatusDialogOpen(o);
            if (o) {
              setNewStatus(paper.status);
              setNewStageId(paper.current_stage_id || "");
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Send className="h-4 w-4" />
                {isAr ? "تغيير الحالة" : "Change Status"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isAr ? "تغيير حالة البحث" : "Change Paper Status"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{isAr ? "الحالة الجديدة" : "New Status"}</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusFlow.filter((s) => s !== paper.status).map((s) => (
                        <SelectItem key={s} value={s}>{t(`papers.status.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("papers.moveToStage")}</Label>
                  {journalStages.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">{isAr ? "لا توجد مراحل معرّفة لهذا المركز" : "No stages defined for this center"}</p>
                  ) : (
                    <Select value={newStageId} onValueChange={setNewStageId}>
                      <SelectTrigger><SelectValue placeholder={t("papers.stageOptional")} /></SelectTrigger>
                      <SelectContent>
                        {journalStages.map((stage: any) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {isAr ? stage.name_ar : stage.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "ملاحظات" : "Notes"}</Label>
                  <Textarea value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} rows={3} />
                </div>
                <Button onClick={() => changeStatus.mutate()} disabled={!newStatus || changeStatus.isPending} className="w-full">
                  {changeStatus.isPending ? t("common.loading") : t("common.confirm")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                {isAr ? "تعيين منسق للبحث" : "Assign Paper Role"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isAr ? "تعيين منسق للبحث" : "Assign Paper Role"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md leading-relaxed">
                  {isAr
                    ? "تعيين شخص من فريق المجلة كمسؤول إداري دائم عن البحث (محرر مسؤول أو منسق متابعة). لإرسال البحث لمحكم علمي لتقييمه، استخدم بدلاً من ذلك زر «إرسال طلب تحكيم» في قسم طلبات التحكيم بالأسفل."
                    : "Assign a journal team member as a permanent handler for this paper (handling editor or coordinator). To send the paper to an external reviewer for evaluation, use the \"Send Review Request\" button in the Review Requests section below."}
                </p>
                <div className="space-y-2">
                  <Label>{t("auth.email")}</Label>
                  <Input value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} type="email" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "الدور" : "Role"}</Label>
                  <Select value={assignRole} onValueChange={setAssignRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">{isAr ? "محرر مسؤول" : "Handling Editor"}</SelectItem>
                      <SelectItem value="reviewer">{isAr ? "محكّم (للسجل فقط)" : "Reviewer (record only)"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => assignReviewer.mutate()} disabled={!assignEmail || assignReviewer.isPending} className="w-full">
                  {assignReviewer.isPending ? t("common.loading") : t("common.confirm")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                {isAr ? "مراسلة الباحث" : "Message Author"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isAr ? "إرسال رسالة" : "Send Message"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} rows={4} placeholder={isAr ? "اكتب رسالتك..." : "Write your message..."} />
                <Button onClick={() => sendMessage.mutate()} disabled={!messageBody || sendMessage.isPending} className="w-full">
                  {sendMessage.isPending ? t("common.loading") : t("common.submit")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={committeeDialogOpen} onOpenChange={setCommitteeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Vote className="h-4 w-4" />
                {isAr ? "إرسال إلى لجنة" : "Send to Committee"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isAr ? "إرسال البحث إلى لجنة" : "Send Paper to Committee"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{isAr ? "اختر اللجنة" : "Select a committee"}</Label>
                  {journalCommittees.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      {isAr ? "لا توجد لجان لهذا المركز" : "No committees for this center"}
                    </p>
                  ) : (
                    <Select value={selectedCommitteeId} onValueChange={setSelectedCommitteeId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {journalCommittees.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {isAr ? c.name_ar : c.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button
                  onClick={() => sendToCommittee.mutate()}
                  disabled={!selectedCommitteeId || sendToCommittee.isPending}
                  className="w-full"
                >
                  {sendToCommittee.isPending ? t("common.loading") : t("common.confirm")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Author revision response */}
      {isAuthor && paper.status === "revision_required" && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-orange-800 dark:text-orange-300">
                {isAr ? "مطلوب تعديلات على البحث" : "Revisions are required for this paper"}
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                {isAr ? "يرجى مراجعة الملاحظات وإعادة رفع الملف المعدل" : "Please review the notes and re-upload the revised file"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paper Info Cards */}
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

      {/* Paper Meta */}
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
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isAr ? "تاريخ التقديم" : "Submitted At"}</span>
            <span>{paper.submitted_at ? new Date(paper.submitted_at).toLocaleDateString(isAr ? "ar-SA" : "en-US") : "-"}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center gap-3">
            <span className="text-muted-foreground">{t("papers.file")}</span>
            {paper.file_url ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  {isAr ? "يوجد ملف" : "File available"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => downloadPaperFile(paper.file_url!)}
                >
                  <FileText className="h-4 w-4" />
                  {isAr ? "تحميل الملف" : "Download File"}
                </Button>
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                {isAr ? "لا يوجد ملف" : "No file"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Requests (Editor View) */}
      {isEditor && (
        <ReviewRequestsPanel paperId={paper.id} journalId={paper.journal_id} />
      )}

      {/* Committee Voting Panel — shown to committee members and editors */}
      {paper && (
        <CommitteeVotingPanel paperId={paper.id} journalId={paper.journal_id} />
      )}

      {/* Review Reports (Editor View) */}
      {isEditor && reviewReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {isAr ? "تقارير التحكيم المقدمة" : "Submitted Review Reports"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {reviewReports.map((report: any, idx: number) => {
              const recColors: Record<string, string> = {
                accept: "bg-green-100 text-green-800",
                minor_revision: "bg-yellow-100 text-yellow-800",
                major_revision: "bg-orange-100 text-orange-800",
                reject: "bg-red-100 text-red-800",
              };
              const recLabels: Record<string, string> = isAr
                ? { accept: "قبول", minor_revision: "تعديلات طفيفة", major_revision: "تعديلات جوهرية", reject: "رفض" }
                : { accept: "Accept", minor_revision: "Minor Revision", major_revision: "Major Revision", reject: "Reject" };
              return (
                <div key={report.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="font-medium">{isAr ? `محكّم ${idx + 1}` : `Reviewer ${idx + 1}`}</span>
                      <span className="text-sm text-muted-foreground">({report.profiles?.full_name})</span>
                    </div>
                    {report.recommendation && (
                      <Badge className={recColors[report.recommendation] || ""}>
                        {recLabels[report.recommendation] || report.recommendation}
                      </Badge>
                    )}
                  </div>
                  {report.criteria_scores?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">{isAr ? "الدرجات:" : "Scores:"}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {report.criteria_scores.map((cs: any) => (
                          <div key={cs.id} className="flex justify-between text-sm bg-muted rounded p-2">
                            <span>{isAr ? cs.evaluation_criteria?.name_ar : cs.evaluation_criteria?.name_en}</span>
                            <span className="font-bold">{cs.score}/{cs.evaluation_criteria?.max_score || 10}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.general_comments && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{isAr ? "ملاحظات عامة:" : "General Comments:"}</p>
                      <p className="text-sm mt-1 bg-muted rounded p-2">{report.general_comments}</p>
                    </div>
                  )}
                  {report.confidential_comments && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {isAr ? "ملاحظات سرية (للمحرر فقط):" : "Confidential (editor only):"}
                      </p>
                      <p className="text-sm mt-1 bg-muted rounded p-2 border-l-2 border-destructive">{report.confidential_comments}</p>
                    </div>
                  )}
                  {report.submitted_at && (
                    <p className="text-xs text-muted-foreground">
                      {isAr ? "تاريخ التقديم:" : "Submitted:"} {new Date(report.submitted_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Assigned Roles (Editor View) */}
      {isEditor && paperRoles && paperRoles.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{isAr ? "الأدوار المعينة" : "Assigned Roles"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paperRoles.map((pr: any) => (
                <div key={pr.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{pr.profiles?.full_name || pr.profiles?.email}</span>
                  </div>
                  <Badge variant="secondary">{pr.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages Thread */}
      {threads && threads.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{isAr ? "الرسائل" : "Messages"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {threads.map((thread: any) => (
                <div key={thread.id} className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">{thread.subject}</p>
                  {thread.messages?.map((msg: any) => (
                    <div key={msg.id} className="rounded-lg bg-muted p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{msg.profiles?.full_name || isAr ? "مجهول" : "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                        </span>
                      </div>
                      <p className="text-sm">{msg.body}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage History - Always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isAr ? "سجل المراحل والتتبع" : "Stage History & Tracking"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!history || history.length === 0) ? (
            <p className="text-muted-foreground text-center py-4">{isAr ? "لا يوجد سجل مراحل بعد" : "No stage history yet"}</p>
          ) : (
            <div className="space-y-4">
              {history.map((h: any, i: number) => (
                <div key={h.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`rounded-full p-1.5 ${i === history.length - 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {i === history.length - 1 ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    {i < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <p className="font-medium">{h.action}</p>
                    {h.workflow_stages && (
                      <p className="text-sm text-muted-foreground">
                        {isAr ? h.workflow_stages.name_ar : h.workflow_stages.name_en}
                      </p>
                    )}
                    {h.notes && <p className="text-sm bg-muted rounded p-2 mt-1">{h.notes}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {(h as any).profiles?.full_name && (
                        <span className="text-xs text-muted-foreground">
                          {isAr ? "بواسطة:" : "By:"} {(h as any).profiles.full_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
