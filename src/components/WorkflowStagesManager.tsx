import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Layers, Wand2 } from "lucide-react";
import { DEFAULT_STAGES } from "@/lib/defaultStages";

const stageTypeColors: Record<string, string> = {
  screening: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  publication: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

interface Props {
  journalId: string;
  isEditor: boolean;
}

interface StageForm {
  name_ar: string;
  name_en: string;
  stage_type: string;
}

const emptyForm: StageForm = { name_ar: "", name_en: "", stage_type: "review" };

export default function WorkflowStagesManager({ journalId, isEditor }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<StageForm>(emptyForm);

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["workflow-stages", journalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("journal_id", journalId)
        .order("stage_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["workflow-stages", journalId] });

  const addStage = useMutation({
    mutationFn: async () => {
      const nextOrder = stages.length > 0 ? Math.max(...stages.map((s: any) => s.stage_order)) + 1 : 1;
      const { error } = await supabase.from("workflow_stages").insert({
        journal_id: journalId,
        name_ar: form.name_ar,
        name_en: form.name_en,
        stage_type: form.stage_type,
        stage_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("journals.stageAdded"));
      setAddOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStage = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase.from("workflow_stages").update({
        name_ar: form.name_ar,
        name_en: form.name_en,
        stage_type: form.stage_type,
      }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("journals.stageUpdated"));
      setEditOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("journals.stageDeleted"));
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = stages.findIndex((s: any) => s.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= stages.length) return;
      const current = stages[idx];
      const swap = stages[swapIdx];
      // Swap orders
      const { error: e1 } = await supabase.from("workflow_stages").update({ stage_order: swap.stage_order }).eq("id", current.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("workflow_stages").update({ stage_order: current.stage_order }).eq("id", swap.id);
      if (e2) throw e2;
    },
    onSuccess: () => invalidate(),
    onError: (err: any) => toast.error(err.message),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const rows = DEFAULT_STAGES.map((s) => ({
        journal_id: journalId,
        name_ar: s.name_ar,
        name_en: s.name_en,
        stage_type: s.stage_type,
        stage_order: s.stage_order,
      }));
      const { error } = await supabase.from("workflow_stages").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("journals.defaultStagesLoaded"));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (stage: any) => {
    setEditId(stage.id);
    setForm({ name_ar: stage.name_ar, name_en: stage.name_en, stage_type: stage.stage_type });
    setEditOpen(true);
  };

  const stageTypeLabel = (type: string) => {
    const key = `journals.stageTypes.${type}` as any;
    return t(key) || type;
  };

  const StageFormFields = ({ isPending, onSubmit, submitLabel }: { isPending: boolean; onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("journals.stageNameAr")}</Label>
        <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
      </div>
      <div className="space-y-2">
        <Label>{t("journals.stageNameEn")}</Label>
        <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" />
      </div>
      <div className="space-y-2">
        <Label>{t("journals.stageType")}</Label>
        <Select value={form.stage_type} onValueChange={(v) => setForm({ ...form, stage_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="screening">{t("journals.stageTypes.screening")}</SelectItem>
            <SelectItem value="review">{t("journals.stageTypes.review")}</SelectItem>
            <SelectItem value="publication">{t("journals.stageTypes.publication")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={onSubmit}
        disabled={!form.name_ar || !form.name_en || isPending}
        className="w-full"
      >
        {isPending ? t("common.loading") : submitLabel}
      </Button>
    </div>
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Layers className="h-4 w-4" />
          {t("journals.workflowStages")}
        </div>
        {isEditor && (
          <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t("journals.addStage")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("journals.addStage")}</DialogTitle></DialogHeader>
              <StageFormFields isPending={addStage.isPending} onSubmit={() => addStage.mutate()} submitLabel={t("common.create")} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
      ) : stages.length === 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("journals.noStages")}</p>
          {isEditor && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={seedDefaults.isPending}
              onClick={() => seedDefaults.mutate()}
            >
              <Wand2 className="h-3.5 w-3.5" />
              {seedDefaults.isPending ? t("common.loading") : t("journals.loadDefaultStages")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {stages.map((stage: any, idx: number) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 rounded-lg border bg-card p-2.5 text-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {stage.stage_order}
              </span>
              <span className="flex-1 font-medium">{isAr ? stage.name_ar : stage.name_en}</span>
              <Badge variant="secondary" className={stageTypeColors[stage.stage_type] || ""}>
                {stageTypeLabel(stage.stage_type)}
              </Badge>
              {isEditor && (
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    disabled={idx === 0 || reorder.isPending}
                    onClick={() => reorder.mutate({ id: stage.id, direction: "up" })}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    disabled={idx === stages.length - 1 || reorder.isPending}
                    onClick={() => reorder.mutate({ id: stage.id, direction: "down" })}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(stage)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(stage.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("journals.editStage")}</DialogTitle></DialogHeader>
          <StageFormFields isPending={updateStage.isPending} onSubmit={() => updateStage.mutate()} submitLabel={t("common.save")} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("journals.confirmDeleteStage")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteStage.mutate(deleteId)}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
