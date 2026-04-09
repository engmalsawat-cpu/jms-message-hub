import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Eye } from "lucide-react";
import { useState } from "react";

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

export default function Papers() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: papers, isLoading } = useQuery({
    queryKey: ["all-papers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .select("*, journals(title_ar, title_en), workflow_stages(name_ar, name_en), profiles!papers_submitted_by_fkey(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = papers?.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (p.title_ar?.toLowerCase().includes(s) || p.title_en?.toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("nav.papers")}</h1>

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "الكل" : "All"}</SelectItem>
            {["submitted", "under_review", "revision_required", "accepted", "rejected", "published"].map((s) => (
              <SelectItem key={s} value={s}>{t(`papers.status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : !filtered?.length ? (
            <p className="text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? t("papers.titleAr") : t("papers.titleEn")}</TableHead>
                  <TableHead>{isAr ? "الباحث" : "Researcher"}</TableHead>
                  <TableHead>{t("journals.title")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{isAr ? "المرحلة" : "Stage"}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell className="font-medium">
                      {isAr ? paper.title_ar : paper.title_en}
                    </TableCell>
                    <TableCell>{paper.profiles?.full_name || paper.profiles?.email}</TableCell>
                    <TableCell>{isAr ? paper.journals?.title_ar : paper.journals?.title_en}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[paper.status] || ""}>{t(`papers.status.${paper.status}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      {paper.workflow_stages ? (isAr ? paper.workflow_stages.name_ar : paper.workflow_stages.name_en) : "-"}
                    </TableCell>
                    <TableCell>
                      <Link to={`/papers/${paper.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
