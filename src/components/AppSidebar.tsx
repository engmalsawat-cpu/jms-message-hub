import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Users,
  MessageSquare,
  Bell,
  Settings,
  DollarSign,
  Send,
  ShieldBan,
  LogOut,
  Gauge,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { t, i18n } = useTranslation();
  const { hasAnyRole, signOut, profile } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isEditor = hasAnyRole(["admin", "editor_in_chief", "managing_editor"]);
  const isAdmin = hasAnyRole(["admin"]);

  const mainItems = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.myPapers"), url: "/my-papers", icon: FileText },
    { title: t("nav.submitPaper"), url: "/submit-paper", icon: Send },
    { title: t("nav.notifications"), url: "/notifications", icon: Bell },
  ];

  const editorItems = [
    { title: t("nav.operations"), url: "/operations", icon: Gauge },
    { title: t("nav.papers"), url: "/papers", icon: FileText },
    { title: t("nav.journals"), url: "/journals", icon: BookOpen },
    { title: t("nav.committees"), url: "/committees", icon: Users },
    { title: t("nav.messages"), url: "/messages", icon: MessageSquare },
  ];

  const adminItems = [
    { title: t("nav.users"), url: "/users", icon: Users },
    { title: t("nav.financial"), url: "/financial", icon: DollarSign },
    { title: t("nav.blacklist"), url: "/blacklist", icon: ShieldBan },
  ];

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" side={i18n.language === "ar" ? "right" : "left"}>
      <SidebarContent>
        {!collapsed && (
          <div className="px-4 py-4">
            <h2 className="text-lg font-bold text-primary">{t("common.appName")}</h2>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && (isEditor ? t("nav.dashboard") : t("nav.submissions"))}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isEditor && (
          <SidebarGroup>
            <SidebarGroupLabel>{!collapsed && t("nav.papers")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(editorItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{!collapsed && t("nav.settings")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(adminItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && profile && (
          <div className="px-2 py-2 text-sm text-muted-foreground truncate">
            {profile.full_name || profile.email}
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          {!collapsed && t("auth.logout")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
