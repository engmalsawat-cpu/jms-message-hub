import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  Eye, Download, Clock, AlertTriangle, TrendingUp,
  BarChart3, Kanban, Filter, FileText, Users as UsersIcon
} from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  revision_required: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  revised: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const PIE_COLORS = [
  "hsl(210, 70%, 50%)", "hsl(45, 80%, 50%)", "hsl(25, 80%, 55%)",
  "hsl(280, 60%, 55%)", "hsl(140, 60%, 45%)", "hsl(0, 65%, 50%)",
  "hsl(160, 60%, 45%)", "hsl(0, 0%, 55%)",
];

const kanbanStatuses = [
  "submitted", "under_review", "revision_required", "revised", "accepted", "rejected", "published",
];

export default function OperationsDashboard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [journalFilter, setJournalFilter] = useState("all");
  const [delayDays, setDelayDays] = useState(14);

  // Fetch all papers with relations
  const { data: papers = [], isLoading } = useQuery({
    queryKey: ["ops-papers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .select("*, journals(title_ar, title_en), profiles:submitted_by(full_name, email), workflow_stages(name_ar, name_en)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch paper roles for reviewer stats
  const { data: paperRoles = [] } = useQuery({
    queryKey: ["ops-paper-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_roles")
        .select("*, profiles:user_id(full_name, email)");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: journals = [] } = useQuery({
    queryKey: ["journals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journals").select("id, title_ar, title_en");
      if (error) throw error;
      return data || [];
    },
  });

  // Filtered papers
  const filtered = useMemo(() => papers.filter((p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (journalFilter !== "all" && p.journal_id !== journalFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        p.title_ar?.toLowerCase().includes(s) ||
        p.title_en?.toLowerCase().includes(s) ||
        p.profiles?.full_name?.toLowerCase().includes(s) ||
        p.profiles?.email?.toLowerCase().includes(s)
      );
    }
    return true;
  }), [papers, statusFilter, journalFilter, search]);

  // --- Analytics Data ---

  // Status distribution
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    papers.forEach((p: any) => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: t(`papers.status.${status}`),
      value: count,
      status,
    }));
  }, [papers, t]);

  // Monthly submissions
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    papers.forEach((p: any) => {
      const d = new Date(p.submitted_at || p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).sort().slice(-12).map(([month, count]) => ({ month, count }));
  }, [papers]);

  // Per-journal distribution
  const journalDist = useMemo(() => {
    const counts: Record<string, { ar: string; en: string; count: number }> = {};
    papers.forEach((p: any) => {
      const jid = p.journal_id;
      if (!counts[jid]) {
        counts[jid] = { ar: p.journals?.title_ar || "", en: p.journals?.title_en || "", count: 0 };
      }
      counts[jid].count++;
    });
    return Object.values(counts).map((j) => ({ name: isAr ? j.ar : j.en, count: j.count }));
  }, [papers, isAr]);

  // Acceptance/rejection rates per journal
  const acceptRejectRates = useMemo(() => {
    const byJournal: Record<string, { name: string; accepted: number; rejected: number; total: number }> = {};
    papers.forEach((p: any) => {
      const jid = p.journal_id;
      if (!byJournal[jid]) {
        byJournal[jid] = { name: isAr ? p.journals?.title_ar : p.journals?.title_en, accepted: 0, rejected: 0, total: 0 };
      }
      byJournal[jid].total++;
      if (p.status === "accepted" || p.status === "published") byJournal[jid].accepted++;
      if (p.status === "rejected") byJournal[jid].rejected++;
    });
    return Object.values(byJournal).map((j) => ({
      ...j,
      acceptRate: j.total > 0 ? Math.round((j.accepted / j.total) * 100) : 0,
      rejectRate: j.total > 0 ? Math.round((j.rejected / j.total) * 100) : 0,
    }));
  }, [papers, isAr]);

  // Delayed papers (no update for N days)
  const delayedPapers = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - delayDays);
    return papers.filter((p: any) => {
      const activeStatuses = ["submitted", "under_review", "revision_required"];
      if (!activeStatuses.includes(p.status)) return false;
      const lastUpdate = new Date(p.updated_at);
      return lastUpdate < cutoff;
    });
  }, [papers, delayDays]);

  // Reviewer performance
  const reviewerStats = useMemo(() => {
    const byUser: Record<string, { name: string; email: string; count: number }> = {};
    paperRoles.filter((r: any) => r.role === "reviewer").forEach((r: any) => {
      if (!byUser[r.user_id]) {
        byUser[r.user_id] = { name: r.profiles?.full_name || "", email: r.profiles?.email || "", count: 0 };
      }
      byUser[r.user_id].count++;
    });
    return Object.values(byUser).sort((a, b) => b.count - a.count);
  }, [paperRoles]);

  // Kanban data
  const kanbanData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    kanbanStatuses.forEach((s) => { groups[s] = []; });
    filtered.forEach((p: any) => {
      if (groups[p.status]) groups[p.status].push(p);
    });
    return groups;
  }, [filtered]);

  // Export CSV
  const exportCSV = () => {
    const headers = [
      isAr ? "العنوان (عربي)" : "Title (AR)",
      isAr ? "العنوان (إنجليزي)" : "Title (EN)",
      isAr ? "الباحث" : "Author",
      isAr ? "المجلة" : "Journal",
      isAr ? "الحالة" : "Status",
      isAr ? "تاريخ التقديم" : "Submitted At",
    ];
    const rows = filtered.map((p: any) => [
      p.title_ar || "",
      p.title_en || "",
      p.profiles?.full_name || p.profiles?.email || "",
      (isAr ? p.journals?.title_ar : p.journals?.title_en) || "",
      t(`papers.status.${p.status}`),
      p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `papers_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{isAr ? "لوحة التشغيل" : "Operations Dashboard"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAr ? `${papers.length} بحث في النظام` : `${papers.length} papers in the system`}
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          {isAr ? "تصدير CSV" : "Export CSV"}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {kanbanStatuses.slice(0, 6).map((s) => {
          const count = papers.filter((p: any) => p.status === s).length;
          return (
            <Card key={s} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}>
              <CardContent className="pt-3 pb-2 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{t(`papers.status.${s}`)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analytics" dir={isAr ? "rtl" : "ltr"}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{isAr ? "تحليلات" : "Analytics"}</span>
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5">
            <Kanban className="h-4 w-4" />
            <span className="hidden sm:inline">{isAr ? "كانبان" : "Kanban"}</span>
          </TabsTrigger>
          <TabsTrigger value="delayed" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">{isAr ? "متأخرة" : "Delayed"}</span>
          </TabsTrigger>
          <TabsTrigger value="reviewers" className="gap-1.5">
            <UsersIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{isAr ? "المحكمون" : "Reviewers"}</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Status Pie */}
            <Card>
              <CardHeader><CardTitle className="text-base">{isAr ? "توزيع الأبحاث حسب الحالة" : "Papers by Status"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                      {statusDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Line */}
            <Card>
              <CardHeader><CardTitle className="text-base">{isAr ? "الأبحاث المقدمة شهرياً" : "Monthly Submissions"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(210, 70%, 50%)" strokeWidth={2} dot={{ r: 4 }} name={isAr ? "عدد الأبحاث" : "Papers"} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Journal Bar */}
            <Card>
              <CardHeader><CardTitle className="text-base">{isAr ? "الأبحاث حسب المجلة" : "Papers per Journal"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={journalDist} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(210, 70%, 50%)" radius={[0, 4, 4, 0]} name={isAr ? "الأبحاث" : "Papers"} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Accept/Reject rates */}
            <Card>
              <CardHeader><CardTitle className="text-base">{isAr ? "نسب القبول والرفض" : "Accept/Reject Rates"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={acceptRejectRates}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="acceptRate" fill="hsl(140, 60%, 45%)" name={isAr ? "نسبة القبول %" : "Accept %"} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejectRate" fill="hsl(0, 65%, 50%)" name={isAr ? "نسبة الرفض %" : "Reject %"} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== KANBAN TAB ===== */}
        <TabsContent value="kanban" className="mt-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap mb-4">
            <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={journalFilter} onValueChange={setJournalFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder={isAr ? "كل المجلات" : "All Journals"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? "كل المجلات" : "All Journals"}</SelectItem>
                {journals.map((j: any) => <SelectItem key={j.id} value={j.id}>{isAr ? j.title_ar : j.title_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
            {kanbanStatuses.map((status) => (
              <div key={status} className="min-w-[240px] max-w-[280px] flex-shrink-0">
                <div className="sticky top-0 bg-background z-10 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={statusColors[status]}>{t(`papers.status.${status}`)}</Badge>
                    <span className="text-xs text-muted-foreground font-medium">{kanbanData[status]?.length || 0}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {kanbanData[status]?.map((paper: any) => {
                    const daysSinceUpdate = Math.floor((Date.now() - new Date(paper.updated_at).getTime()) / 86400000);
                    return (
                      <Link to={`/papers/${paper.id}`} key={paper.id}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-3 space-y-1.5">
                            <p className="text-sm font-medium line-clamp-2">{isAr ? paper.title_ar : paper.title_en}</p>
                            <p className="text-xs text-muted-foreground">{paper.profiles?.full_name || paper.profiles?.email}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {isAr ? paper.journals?.title_ar : paper.journals?.title_en}
                              </span>
                              {daysSinceUpdate > 7 && (
                                <span className="text-xs text-orange-600 flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {daysSinceUpdate}{isAr ? "ي" : "d"}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                  {(!kanbanData[status] || kanbanData[status].length === 0) && (
                    <div className="text-center text-xs text-muted-foreground py-8 border rounded-lg border-dashed">
                      {isAr ? "لا توجد أبحاث" : "No papers"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ===== DELAYED TAB ===== */}
        <TabsContent value="delayed" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">{isAr ? "أبحاث لم يتم تحديثها منذ" : "Papers not updated for"}</span>
            <Select value={String(delayDays)} onValueChange={(v) => setDelayDays(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 {isAr ? "أيام" : "days"}</SelectItem>
                <SelectItem value="14">14 {isAr ? "يوم" : "days"}</SelectItem>
                <SelectItem value="30">30 {isAr ? "يوم" : "days"}</SelectItem>
                <SelectItem value="60">60 {isAr ? "يوم" : "days"}</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {delayedPapers.length} {isAr ? "بحث متأخر" : "delayed"}
            </Badge>
          </div>

          <Card>
            <CardContent className="pt-6">
              {delayedPapers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{isAr ? "لا توجد أبحاث متأخرة 🎉" : "No delayed papers 🎉"}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">{isAr ? "العنوان" : "Title"}</TableHead>
                        <TableHead className="text-start">{isAr ? "الباحث" : "Author"}</TableHead>
                        <TableHead className="text-start">{t("common.status")}</TableHead>
                        <TableHead className="text-start">{isAr ? "أيام التأخر" : "Days Late"}</TableHead>
                        <TableHead className="text-start w-16">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {delayedPapers.map((p: any) => {
                        const days = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000);
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{isAr ? p.title_ar : p.title_en}</TableCell>
                            <TableCell>{p.profiles?.full_name || p.profiles?.email}</TableCell>
                            <TableCell><Badge className={statusColors[p.status]}>{t(`papers.status.${p.status}`)}</Badge></TableCell>
                            <TableCell>
                              <span className="text-destructive font-medium">{days} {isAr ? "يوم" : "days"}</span>
                            </TableCell>
                            <TableCell>
                              <Link to={`/papers/${p.id}`}><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== REVIEWERS TAB ===== */}
        <TabsContent value="reviewers" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{isAr ? "أداء المحكمين" : "Reviewer Performance"}</CardTitle></CardHeader>
            <CardContent>
              {reviewerStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{isAr ? "لا يوجد محكمون معينون" : "No reviewers assigned"}</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(200, reviewerStats.length * 40)}>
                    <BarChart data={reviewerStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(280, 60%, 55%)" radius={[0, 4, 4, 0]} name={isAr ? "الأبحاث المعينة" : "Assigned Papers"} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="overflow-x-auto mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-start">{isAr ? "المحكم" : "Reviewer"}</TableHead>
                          <TableHead className="text-start">{t("auth.email")}</TableHead>
                          <TableHead className="text-start">{isAr ? "عدد الأبحاث" : "Papers Count"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reviewerStats.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{r.name || "-"}</TableCell>
                            <TableCell dir="ltr">{r.email}</TableCell>
                            <TableCell><Badge variant="secondary">{r.count}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
