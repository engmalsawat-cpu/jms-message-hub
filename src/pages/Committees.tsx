import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Vote } from "lucide-react";

export default function Committees() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const { data: committees, isLoading } = useQuery({
    queryKey: ["committees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committees")
        .select("*, journals(title_ar, title_en), committee_members(id, user_id, is_head, profiles:user_id(full_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const votingLabels: Record<string, { ar: string; en: string }> = {
    majority: { ar: "أغلبية", en: "Majority" },
    unanimous: { ar: "إجماع", en: "Unanimous" },
    weighted: { ar: "موزون", en: "Weighted" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("nav.committees")}</h1>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !committees?.length ? (
        <p className="text-muted-foreground">{t("common.noData")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {committees.map((c) => {
            const vm = votingLabels[c.voting_mechanism] || votingLabels.majority;
            const head = c.committee_members?.find((m: any) => m.is_head);
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
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t("committees.minVotes")}:</span>
                    <span>{c.min_votes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t("committees.members")}:</span>
                    <span>{c.committee_members?.length || 0}</span>
                  </div>
                  {head && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{t("committees.head")}:</span>
                      <span>{(head as any).profiles?.full_name || "-"}</span>
                    </div>
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
