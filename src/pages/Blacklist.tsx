import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function Blacklist() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === "ar";
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ email: "", journal_id: "", reason: "" });

  const { data: journals } = useQuery({
    queryKey: ["journals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journals").select("id, title_ar, title_en");
      if (error) throw error;
      return data;
    },
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["blacklist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blacklist")
        .select("*, journals(title_ar, title_en)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("blacklist").insert({
        email: form.email,
        journal_id: form.journal_id,
        reason: form.reason || null,
        added_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blacklist"] });
      toast.success(isAr ? "تمت الإضافة" : "Entry added");
      setAddOpen(false);
      setForm({ email: "", journal_id: "", reason: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blacklist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blacklist"] });
      toast.success(isAr ? "تمت الإزالة" : "Entry removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("nav.blacklist")}</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />{isAr ? "إضافة" : "Add"}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAr ? "إضافة إلى القائمة السوداء" : "Add to Blacklist"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t("journals.title")}</Label>
                <Select value={form.journal_id} onValueChange={(v) => setForm({ ...form, journal_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {journals?.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{isAr ? j.title_ar : j.title_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "السبب" : "Reason"}</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} />
              </div>
              <Button onClick={() => addEntry.mutate()} disabled={!form.email || !form.journal_id || addEntry.isPending} className="w-full">
                {addEntry.isPending ? t("common.loading") : t("common.confirm")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : !entries?.length ? (
            <p className="text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("auth.email")}</TableHead>
                    <TableHead className="text-start">{t("journals.title")}</TableHead>
                    <TableHead className="text-start">{isAr ? "السبب" : "Reason"}</TableHead>
                    <TableHead className="text-start">{isAr ? "التاريخ" : "Date"}</TableHead>
                    <TableHead className="text-start w-16">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell dir="ltr">{e.email}</TableCell>
                      <TableCell>{isAr ? e.journals?.title_ar : e.journals?.title_en}</TableCell>
                      <TableCell>{e.reason || "-"}</TableCell>
                      <TableCell>{new Date(e.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeEntry.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
