import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getRoles = (userId: string) => allRoles?.filter((r) => r.user_id === userId) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("nav.users")}</h1>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auth.fullName")}</TableHead>
                  <TableHead>{t("auth.email")}</TableHead>
                  <TableHead>{isAr ? "الأدوار" : "Roles"}</TableHead>
                  <TableHead>{isAr ? "تاريخ التسجيل" : "Joined"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || "-"}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {getRoles(p.id).map((r) => (
                          <Badge key={r.id} variant="secondary">{t(`roles.${r.role}`)}</Badge>
                        ))}
                        {getRoles(p.id).length === 0 && <span className="text-muted-foreground text-sm">{t("roles.researcher")}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</TableCell>
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
