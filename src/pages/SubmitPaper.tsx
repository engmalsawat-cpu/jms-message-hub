import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export default function SubmitPaper() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAr = i18n.language === "ar";

  const [form, setForm] = useState({
    journal_id: "",
    title_ar: "",
    title_en: "",
    abstract_ar: "",
    abstract_en: "",
    keywords: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: journals } = useQuery({
    queryKey: ["journals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journals").select("*").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let fileUrl: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("papers")
          .upload(path, file);
        if (uploadError) throw uploadError;
        fileUrl = path;
      }

      const { error } = await supabase.from("papers").insert({
        journal_id: form.journal_id,
        submitted_by: user.id,
        title_ar: form.title_ar,
        title_en: form.title_en,
        abstract_ar: form.abstract_ar,
        abstract_en: form.abstract_en,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        file_url: fileUrl,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success(isAr ? "تم تقديم البحث بنجاح" : "Paper submitted successfully");
      navigate("/my-papers");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">{t("nav.submitPaper")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("papers.newPaper")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>{t("journals.title")}</Label>
              <Select value={form.journal_id} onValueChange={(v) => setForm({ ...form, journal_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {journals?.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {isAr ? j.title_ar : j.title_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("papers.titleAr")}</Label>
                <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} required dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>{t("papers.titleEn")}</Label>
                <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} required dir="ltr" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("papers.abstractAr")}</Label>
                <Textarea value={form.abstract_ar} onChange={(e) => setForm({ ...form, abstract_ar: e.target.value })} rows={5} dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>{t("papers.abstractEn")}</Label>
                <Textarea value={form.abstract_en} onChange={(e) => setForm({ ...form, abstract_en: e.target.value })} rows={5} dir="ltr" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("papers.keywords")}</Label>
              <Input
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder={isAr ? "كلمة1, كلمة2, كلمة3" : "keyword1, keyword2, keyword3"}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("papers.file")}</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && <Upload className="h-4 w-4 text-green-600" />}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !form.journal_id}>
              {loading ? t("common.loading") : t("common.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
