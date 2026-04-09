import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Blacklist() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("nav.blacklist")}</h1>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : !entries?.length ? (
            <p className="text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auth.email")}</TableHead>
                  <TableHead>{t("journals.title")}</TableHead>
                  <TableHead>{isAr ? "السبب" : "Reason"}</TableHead>
                  <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.email}</TableCell>
                    <TableCell>{isAr ? e.journals?.title_ar : e.journals?.title_en}</TableCell>
                    <TableCell>{e.reason || "-"}</TableCell>
                    <TableCell>{new Date(e.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</TableCell>
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
