import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye } from "lucide-react";

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

export default function MyPapers() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === "ar";

  const { data: papers, isLoading } = useQuery({
    queryKey: ["my-papers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .select("*, journals(title_ar, title_en), workflow_stages(name_ar, name_en)")
        .eq("submitted_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("nav.myPapers")}</h1>
        <Link to="/submit-paper">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("papers.newPaper")}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("papers.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : !papers?.length ? (
            <p className="text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{isAr ? t("papers.titleAr") : t("papers.titleEn")}</TableHead>
                  <TableHead className="text-start">{t("journals.title")}</TableHead>
                  <TableHead className="text-start">{t("common.status")}</TableHead>
                  <TableHead className="text-start w-16">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {papers.map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell className="font-medium">
                      {isAr ? paper.title_ar : paper.title_en}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isAr ? paper.journals?.title_ar : paper.journals?.title_en}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[paper.status] || ""}>
                        {t(`papers.status.${paper.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={`/papers/${paper.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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
