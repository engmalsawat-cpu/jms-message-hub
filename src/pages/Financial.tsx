import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign } from "lucide-react";

export default function Financial() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const { data: records, isLoading } = useQuery({
    queryKey: ["financial-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*, journals(title_ar, title_en), papers(title_ar, title_en)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const statusBadge: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    overdue: "bg-red-100 text-red-800",
  };

  const totalPaid = records?.filter((r) => r.status === "paid").reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const totalPending = records?.filter((r) => r.status === "pending").reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("nav.financial")}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{isAr ? "إجمالي المدفوعات" : "Total Paid"}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} SAR</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{isAr ? "قيد الانتظار" : "Pending"}</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{totalPending.toLocaleString()} SAR</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{isAr ? "الإجمالي" : "Total"}</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{(totalPaid + totalPending).toLocaleString()} SAR</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("journals.title")}</TableHead>
                  <TableHead>{isAr ? "البحث" : "Paper"}</TableHead>
                  <TableHead>{isAr ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isAr ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{isAr ? r.journals?.title_ar : r.journals?.title_en}</TableCell>
                    <TableCell>{isAr ? r.papers?.title_ar : r.papers?.title_en}</TableCell>
                    <TableCell>{r.record_type}</TableCell>
                    <TableCell>{Number(r.amount).toLocaleString()} {r.currency}</TableCell>
                    <TableCell><Badge className={statusBadge[r.status] || ""}>{r.status}</Badge></TableCell>
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
