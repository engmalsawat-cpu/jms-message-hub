import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BookOpen, Users, Send, Bell, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, profile, roles, hasAnyRole } = useAuth();
  const isAr = i18n.language === "ar";
  const isEditor = hasAnyRole(["admin", "editor_in_chief", "managing_editor"]);

  const { data: myPapers } = useQuery({
    queryKey: ["my-papers-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("papers").select("*", { count: "exact", head: true }).eq("submitted_by", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: allPapers } = useQuery({
    queryKey: ["all-papers-count"],
    queryFn: async () => {
      const { count } = await supabase.from("papers").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: isEditor,
  });

  const { data: journalCount } = useQuery({
    queryKey: ["journals-count"],
    queryFn: async () => {
      const { count } = await supabase.from("journals").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: isEditor,
  });

  const { data: committeeCount } = useQuery({
    queryKey: ["committees-count"],
    queryFn: async () => {
      const { count } = await supabase.from("committees").select("*", { count: "exact", head: true });
      return count || 0;
    },
    enabled: isEditor,
  });

  const { data: unreadNotifs } = useQuery({
    queryKey: ["unread-notifs", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
  });

  const StatCard = ({ title, count, icon: Icon, to, color }: { title: string; count: number; icon: any; to: string; color?: string }) => (
    <Link to={to}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="flex flex-row-reverse items-center justify-between pb-2">
          <Icon className={`h-5 w-5 ${color || "text-muted-foreground"}`} />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{count}</div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("nav.dashboard")}</h1>
        <p className="text-muted-foreground mt-1">
          {isAr ? `مرحباً، ${profile?.full_name || ""}` : `Welcome, ${profile?.full_name || ""}`}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("nav.myPapers")} count={myPapers ?? 0} icon={FileText} to="/my-papers" color="text-primary" />
        <StatCard title={t("nav.notifications")} count={unreadNotifs ?? 0} icon={Bell} to="/notifications" color="text-accent" />

        {isEditor && (
          <>
            <StatCard title={t("nav.papers")} count={allPapers ?? 0} icon={Send} to="/papers" color="text-primary" />
            <StatCard title={t("nav.journals")} count={journalCount ?? 0} icon={BookOpen} to="/journals" />
            <StatCard title={t("nav.committees")} count={committeeCount ?? 0} icon={Users} to="/committees" />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? "الأدوار" : "Your Roles"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {roles.length > 0
              ? roles.map((r) => (
                  <span key={r} className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {t("roles." + r)}
                  </span>
                ))
              : <span className="text-muted-foreground">{t("roles.researcher")}</span>
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
