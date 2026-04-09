import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  UserPlus, Send, MessageSquare, AlertTriangle
} from "lucide-react";
import { ReviewRequestsPanel } from "@/components/ReviewRequestsPanel";

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

export default function PaperDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user, hasAnyRole } = useAuth();
  const isAr = i18n.language === "ar";
  const BackArrow = isAr ? ArrowRight : ArrowLeft;
  const queryClient = useQueryClient();
  const isEditor = hasAnyRole(["admin", "editor_in_chief", "managing_editor"]);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState("reviewer");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");

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

  const changeStatus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("papers")
        .update({ status: newStatus as any })
        .eq("id", id!);
      if (error) throw error;

      await supabase.from("paper_stage_history").insert({
        paper_id: id!,
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
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
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
                {isAr ? "تعيين محكّم" : "Assign Reviewer"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isAr ? "تعيين دور للبحث" : "Assign Paper Role"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("auth.email")}</Label>
                  <Input value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} type="email" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "الدور" : "Role"}</Label>
                  <Select value={assignRole} onValueChange={setAssignRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reviewer">{t("roles.reviewer")}</SelectItem>
                      <SelectItem value="editor">{isAr ? "محرر" : "Editor"}</SelectItem>
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
          {paper.file_url && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("papers.file")}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    const { data } = await supabase.storage.from("papers").createSignedUrl(paper.file_url!, 3600);
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    else toast.error(isAr ? "تعذر فتح الملف" : "Could not open file");
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {isAr ? "تحميل الملف" : "Download File"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Requests (Editor View) */}
      {isEditor && (
        <ReviewRequestsPanel paperId={paper.id} journalId={paper.journal_id} />
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

      {/* Stage History */}
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
