import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GraduationCap, Briefcase, BookOpen, User } from "lucide-react";

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isAr = i18n.language === "ar";

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || "",
    phone: (profile as any)?.phone || "",
    academic_rank: (profile as any)?.academic_rank || "",
    institution: (profile as any)?.institution || "",
    bio: (profile as any)?.bio || "",
    orcid: (profile as any)?.orcid || "",
    google_scholar_url: (profile as any)?.google_scholar_url || "",
    country: (profile as any)?.country || "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const { error } = await supabase
        .from("profiles")
        .update(data as any)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("profile.updated"));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error(t("profile.updateError")),
  });

  // Academic Qualifications
  const { data: qualifications = [] } = useQuery({
    queryKey: ["qualifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_qualifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("graduation_year", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Scientific Productions
  const { data: productions = [] } = useQuery({
    queryKey: ["productions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scientific_productions")
        .select("*")
        .eq("user_id", user!.id)
        .order("publication_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Work Experiences
  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_experiences")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <h1 className="text-2xl font-bold text-foreground">{t("profile.title")}</h1>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="gap-2">
            <User className="h-4 w-4" />
            {t("profile.personalInfo")}
          </TabsTrigger>
          <TabsTrigger value="qualifications" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            {t("profile.qualifications")}
          </TabsTrigger>
          <TabsTrigger value="productions" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t("profile.productions")}
          </TabsTrigger>
          <TabsTrigger value="experience" className="gap-2">
            <Briefcase className="h-4 w-4" />
            {t("profile.experience")}
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.personalInfo")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfileMutation.mutate(profileForm);
                }}
              >
                <div className="space-y-2">
                  <Label>{t("auth.fullName")}</Label>
                  <Input value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("profile.phone")}</Label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("profile.academicRank")}</Label>
                  <Select value={profileForm.academic_rank} onValueChange={(v) => setProfileForm((p) => ({ ...p, academic_rank: v }))}>
                    <SelectTrigger><SelectValue placeholder={t("profile.selectRank")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professor">{t("profile.ranks.professor")}</SelectItem>
                      <SelectItem value="associate_professor">{t("profile.ranks.associateProfessor")}</SelectItem>
                      <SelectItem value="assistant_professor">{t("profile.ranks.assistantProfessor")}</SelectItem>
                      <SelectItem value="lecturer">{t("profile.ranks.lecturer")}</SelectItem>
                      <SelectItem value="researcher">{t("profile.ranks.researcher")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("profile.institution")}</Label>
                  <Input value={profileForm.institution} onChange={(e) => setProfileForm((p) => ({ ...p, institution: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("profile.country")}</Label>
                  <Input value={profileForm.country} onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>ORCID</Label>
                  <Input value={profileForm.orcid} onChange={(e) => setProfileForm((p) => ({ ...p, orcid: e.target.value }))} placeholder="0000-0000-0000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Google Scholar</Label>
                  <Input value={profileForm.google_scholar_url} onChange={(e) => setProfileForm((p) => ({ ...p, google_scholar_url: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("profile.bio")}</Label>
                  <Textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} rows={3} />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications">
          <CRUDSection
            title={t("profile.qualifications")}
            items={qualifications}
            table="academic_qualifications"
            userId={user?.id || ""}
            fields={[
              { key: "degree", label: t("profile.degree"), type: "select", options: [
                { value: "bachelor", label: t("profile.degrees.bachelor") },
                { value: "master", label: t("profile.degrees.master") },
                { value: "doctorate", label: t("profile.degrees.doctorate") },
                { value: "diploma", label: t("profile.degrees.diploma") },
              ]},
              { key: "field_of_study", label: t("profile.fieldOfStudy"), type: "text" },
              { key: "institution", label: t("profile.institution"), type: "text" },
              { key: "graduation_year", label: t("profile.graduationYear"), type: "number" },
              { key: "country", label: t("profile.country"), type: "text" },
            ]}
            renderItem={(item: any) => (
              <div>
                <p className="font-medium">{item.degree} - {item.field_of_study}</p>
                <p className="text-sm text-muted-foreground">{item.institution} {item.graduation_year && `(${item.graduation_year})`}</p>
              </div>
            )}
          />
        </TabsContent>

        {/* Productions Tab */}
        <TabsContent value="productions">
          <CRUDSection
            title={t("profile.productions")}
            items={productions}
            table="scientific_productions"
            userId={user?.id || ""}
            fields={[
              { key: "production_type", label: t("profile.productionType"), type: "select", options: [
                { value: "paper", label: t("profile.productionTypes.paper") },
                { value: "book", label: t("profile.productionTypes.book") },
                { value: "article", label: t("profile.productionTypes.article") },
                { value: "patent", label: t("profile.productionTypes.patent") },
              ]},
              { key: "title", label: t("profile.productionTitle"), type: "text" },
              { key: "publisher", label: t("profile.publisher"), type: "text" },
              { key: "publication_date", label: t("profile.publicationDate"), type: "date" },
              { key: "url", label: t("profile.url"), type: "text" },
              { key: "description", label: t("profile.description"), type: "textarea" },
            ]}
            renderItem={(item: any) => (
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.publisher} {item.publication_date && `(${item.publication_date})`}</p>
              </div>
            )}
          />
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience">
          <CRUDSection
            title={t("profile.experience")}
            items={experiences}
            table="work_experiences"
            userId={user?.id || ""}
            fields={[
              { key: "job_title", label: t("profile.jobTitle"), type: "text" },
              { key: "organization", label: t("profile.organization"), type: "text" },
              { key: "start_date", label: t("profile.startDate"), type: "date" },
              { key: "end_date", label: t("profile.endDate"), type: "date" },
              { key: "is_current", label: t("profile.isCurrent"), type: "checkbox" },
              { key: "description", label: t("profile.description"), type: "textarea" },
            ]}
            renderItem={(item: any) => (
              <div>
                <p className="font-medium">{item.job_title}</p>
                <p className="text-sm text-muted-foreground">{item.organization} ({item.start_date} - {item.is_current ? t("profile.present") : item.end_date})</p>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Generic CRUD Section Component
interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  options?: { value: string; label: string }[];
}

function CRUDSection({
  title,
  items,
  table,
  userId,
  fields,
  renderItem,
}: {
  title: string;
  items: any[];
  table: string;
  userId: string;
  fields: FieldDef[];
  renderItem: (item: any) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const resetForm = () => {
    setFormData({});
    setEditing(null);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (editing) {
        const { error } = await supabase
          .from(table as any)
          .update(data as any)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table as any)
          .insert({ ...data, user_id: userId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("common.save"));
      queryClient.invalidateQueries({ queryKey: [table.replace("academic_", "").replace("scientific_", "").replace("work_", "")] });
      queryClient.invalidateQueries({ queryKey: ["qualifications"] });
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      queryClient.invalidateQueries({ queryKey: ["experiences"] });
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error(t("profile.saveError")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("common.delete"));
      queryClient.invalidateQueries({ queryKey: ["qualifications"] });
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      queryClient.invalidateQueries({ queryKey: ["experiences"] });
    },
  });

  const openEdit = (item: any) => {
    setEditing(item);
    const data: Record<string, any> = {};
    fields.forEach((f) => (data[f.key] = item[f.key] || ""));
    setFormData(data);
    setOpen(true);
  };

  const openNew = () => {
    resetForm();
    const data: Record<string, any> = {};
    fields.forEach((f) => (data[f.key] = f.type === "checkbox" ? false : ""));
    setFormData(data);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 me-1" />
              {t("common.create")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? t("common.edit") : t("common.create")}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
            >
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  {field.type === "select" ? (
                    <Select
                      value={formData[field.key] || ""}
                      onValueChange={(v) => setFormData((p) => ({ ...p, [field.key]: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "textarea" ? (
                    <Textarea
                      value={formData[field.key] || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                    />
                  ) : field.type === "checkbox" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData[field.key] || false}
                        onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{field.label}</span>
                    </div>
                  ) : (
                    <Input
                      type={field.type}
                      value={formData[field.key] || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("common.noData")}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                {renderItem(item)}
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
