import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Vote, Plus, UserPlus, Trash2 } from "lucide-react";

export default function Committees() {
  const { t, i18n } = useTranslation();
  const { hasAnyRole } = useAuth();
  const isAr = i18n.language === "ar";
  const isEditor = hasAnyRole(["admin", "editor_in_chief", "hq_admin"]);
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState<string | null>(null);
  const [form, setForm] = useState({
    name_ar: "", name_en: "", committee_type: "review", voting_mechanism: "majority",
    min_votes: "1", journal_id: "",
  });
  const [memberEmail, setMemberEmail] = useState("");
  const [memberIsHead, setMemberIsHead] = useState(false);

  const { data: journals } = useQuery({
    queryKey: ["journals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journals").select("id, title_ar, title_en");
      if (error) throw error;
      return data;
    },
  });

  const { data: committees, isLoading } = useQuery({
    queryKey: ["committees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committees")
        .select("*, journals(title_ar, title_en), committee_members(id, user_id, is_head)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(
        new Set((data ?? []).flatMap((c: any) => (c.committee_members ?? []).map((m: any) => m.user_id)))
      );
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profilesMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]));
      }
      return (data ?? []).map((c: any) => ({
        ...c,
        committee_members: (c.committee_members ?? []).map((m: any) => ({ ...m, profiles: profilesMap[m.user_id] ?? null })),
      }));
    },
  });

  const createCommittee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("committees").insert({
        name_ar: form.name_ar,
        name_en: form.name_en,
        committee_type: form.committee_type,
        voting_mechanism: form.voting_mechanism,
        min_votes: parseInt(form.min_votes),
        journal_id: form.journal_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committees"] });
      toast.success(isAr ? "تم إنشاء اللجنة" : "Committee created");
      setCreateOpen(false);
      setForm({ name_ar: "", name_en: "", committee_type: "review", voting_mechanism: "majority", min_votes: "1", journal_id: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addMember = useMutation({
    mutationFn: async (committeeId: string) => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles").select("id").eq("email", memberEmail).single();
      if (pErr) throw new Error(isAr ? "لم يتم العثور على المستخدم" : "User not found");

      const { error } = await supabase.from("committee_members").insert({
        committee_id: committeeId,
        user_id: profile.id,
        is_head: memberIsHead,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committees"] });
      toast.success(isAr ? "تمت إضافة العضو" : "Member added");
      setAddMemberOpen(null);
      setMemberEmail("");
      setMemberIsHead(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("committee_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committees"] });
      toast.success(isAr ? "تمت إزالة العضو" : "Member removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const votingLabels: Record<string, { ar: string; en: string }> = {
    majority: { ar: "أغلبية", en: "Majority" },
    unanimous: { ar: "إجماع", en: "Unanimous" },
    weighted: { ar: "موزون", en: "Weighted" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("nav.committees")}</h1>
        {isEditor && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />{t("committees.newCommittee")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("committees.newCommittee")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{isAr ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
                </div>
                <div className="space-y-2">
                  <Label>{isAr ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                  <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} dir="ltr" />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("committees.votingMechanism")}</Label>
                    <Select value={form.voting_mechanism} onValueChange={(v) => setForm({ ...form, voting_mechanism: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="majority">{isAr ? "أغلبية" : "Majority"}</SelectItem>
                        <SelectItem value="unanimous">{isAr ? "إجماع" : "Unanimous"}</SelectItem>
                        <SelectItem value="weighted">{isAr ? "موزون" : "Weighted"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("committees.minVotes")}</Label>
                    <Input type="number" min="1" value={form.min_votes} onChange={(e) => setForm({ ...form, min_votes: e.target.value })} />
                  </div>
                </div>
                <Button onClick={() => createCommittee.mutate()} disabled={!form.name_ar || !form.name_en || !form.journal_id || createCommittee.isPending} className="w-full">
                  {createCommittee.isPending ? t("common.loading") : t("common.create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !committees?.length ? (
        <p className="text-muted-foreground">{t("common.noData")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {committees.map((c) => {
            const vm = votingLabels[c.voting_mechanism] || votingLabels.majority;
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 items-start">
                      <div className="rounded-lg bg-accent/10 p-2">
                        <Users className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{isAr ? c.name_ar : c.name_en}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {isAr ? c.journals?.title_ar : c.journals?.title_en}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{c.committee_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Vote className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("committees.votingMechanism")}:</span>
                    <span>{isAr ? vm.ar : vm.en}</span>
                    <span className="text-muted-foreground ms-2">({t("committees.minVotes")}: {c.min_votes})</span>
                  </div>

                  {/* Members list */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t("committees.members")} ({c.committee_members?.length || 0})</p>
                    {c.committee_members?.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span>{m.profiles?.full_name || m.profiles?.email || "-"}</span>
                          {m.is_head && <Badge variant="default" className="text-xs">{t("committees.head")}</Badge>}
                        </div>
                        {isEditor && (
                          <Button variant="ghost" size="sm" onClick={() => removeMember.mutate(m.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {isEditor && (
                    <Dialog open={addMemberOpen === c.id} onOpenChange={(open) => setAddMemberOpen(open ? c.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 w-full">
                          <UserPlus className="h-4 w-4" />
                          {isAr ? "إضافة عضو" : "Add Member"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{isAr ? "إضافة عضو" : "Add Member"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>{t("auth.email")}</Label>
                            <Input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} type="email" dir="ltr" />
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="is-head" checked={memberIsHead} onChange={(e) => setMemberIsHead(e.target.checked)} />
                            <Label htmlFor="is-head">{t("committees.head")}</Label>
                          </div>
                          <Button onClick={() => addMember.mutate(c.id)} disabled={!memberEmail || addMember.isPending} className="w-full">
                            {addMember.isPending ? t("common.loading") : t("common.confirm")}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
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
