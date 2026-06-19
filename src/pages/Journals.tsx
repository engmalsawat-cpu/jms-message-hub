import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Plus } from "lucide-react";
import WorkflowStagesManager from "@/components/WorkflowStagesManager";

export default function Journals() {
  const { t, i18n } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const isAr = i18n.language === "ar";
  const isEditor = hasAnyRole(["admin", "editor_in_chief", "hq_admin"]);
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title_ar: "", title_en: "", description_ar: "", description_en: "", issn: "",
  });

  const { data: journals, isLoading } = useQuery({
    queryKey: ["journals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createJournal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("journals").insert({
        title_ar: form.title_ar,
        title_en: form.title_en,
        description_ar: form.description_ar || null,
        description_en: form.description_en || null,
        issn: form.issn || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      toast.success(isAr ? "تم إنشاء المركز" : "Center created");
      setCreateOpen(false);
      setForm({ title_ar: "", title_en: "", description_ar: "", description_en: "", issn: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusLabel: Record<string, { ar: string; en: string; color: string }> = {
    active: { ar: "نشطة", en: "Active", color: "bg-green-100 text-green-800" },
    inactive: { ar: "غير نشطة", en: "Inactive", color: "bg-yellow-100 text-yellow-800" },
    archived: { ar: "مؤرشفة", en: "Archived", color: "bg-gray-100 text-gray-800" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("nav.journals")}</h1>
        {isEditor && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />{t("journals.newJournal")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("journals.newJournal")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("journals.titleAr")}</Label>
                  <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} dir="rtl" />
                </div>
                <div className="space-y-2">
                  <Label>{t("journals.titleEn")}</Label>
                  <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} dir="rtl" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} dir="ltr" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>{t("journals.issn")}</Label>
                  <Input value={form.issn} onChange={(e) => setForm({ ...form, issn: e.target.value })} dir="ltr" />
                </div>
                <Button onClick={() => createJournal.mutate()} disabled={!form.title_ar || !form.title_en || createJournal.isPending} className="w-full">
                  {createJournal.isPending ? t("common.loading") : t("common.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

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
                  <WorkflowStagesManager journalId={j.id} isEditor={isEditor} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
