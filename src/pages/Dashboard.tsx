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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("nav.dashboard")}</h1>
        <p className="text-muted-foreground mt-1">
          {isAr ? `مرحباً، ${profile?.full_name || ""}` : `Welcome, ${profile?.full_name || ""}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/my-papers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("nav.myPapers")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{myPapers ?? 0}</div></CardContent>
          </Card>
        </Link>

        <Link to="/notifications">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("nav.notifications")}</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{unreadNotifs ?? 0}</div></CardContent>
          </Card>
        </Link>

        {isEditor && (
          <>
            <Link to="/papers">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("nav.papers")}</CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{allPapers ?? 0}</div></CardContent>
              </Card>
            </Link>

            <Link to="/journals">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("nav.journals")}</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{journalCount ?? 0}</div></CardContent>
              </Card>
            </Link>

            <Link to="/committees">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t("nav.committees")}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{committeeCount ?? 0}</div></CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? "الأدوار" : "Your Roles"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {roles.length > 0 ? roles.map((r) => t("roles." + r)).join(", ") : t("roles.researcher")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
