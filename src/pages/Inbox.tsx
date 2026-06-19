import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, ClipboardCheck, Clock, FileText, Inbox as InboxIcon, Vote } from "lucide-react";

export default function Inbox() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === "ar";

  // Section 1: Pending review requests (reviewer_id = me, status = pending)
  const { data: pendingReviews = [] } = useQuery({
    queryKey: ["inbox-pending-reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_requests")
        .select("*, papers(title_ar, title_en, journals(title_ar, title_en))")
        .eq("reviewer_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Section 2: Active reviews (reviewer_id = me, status = accepted)
  const { data: activeReviews = [] } = useQuery({
    queryKey: ["inbox-active-reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_requests")
        .select("*, papers(title_ar, title_en, journals(title_ar, title_en))")
        .eq("reviewer_id", user!.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Section 3: My papers needing revision (submitted_by = me, status = revision_required)
  const { data: revisionPapers = [] } = useQuery({
    queryKey: ["inbox-revision-papers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .select("*, journals(title_ar, title_en)")
        .eq("submitted_by", user!.id)
        .eq("status", "revision_required")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Section 4: Committee papers awaiting my vote
  // Find committee_papers where:
  //   - I am a member of the committee
  //   - The paper is not yet decided (status != 'decided')
  //   - I have NOT yet cast a vote (no committee_votes row with my user_id)
  const { data: awaitingVotes = [] } = useQuery({
    queryKey: ["inbox-awaiting-committee-vote", user?.id],
    queryFn: async () => {
      // 1. Get committees I am a member of
      const { data: myMemberships, error: mErr } = await supabase
        .from("committee_members")
        .select("committee_id")
        .eq("user_id", user!.id);
      if (mErr) throw mErr;
      if (!myMemberships?.length) return [];

      const committeeIds = myMemberships.map((m: any) => m.committee_id);

      // 2. Get committee_papers in those committees that are still pending
      const { data: cps, error: cpErr } = await supabase
        .from("committee_papers")
        .select(`
          id,
          committee_id,
          paper_id,
          status,
          papers(id, title_ar, title_en, journals(title_ar, title_en)),
          committees(name_ar, name_en),
          committee_votes(id, user_id)
        `)
        .in("committee_id", committeeIds)
        .neq("status", "decided");
      if (cpErr) throw cpErr;

      // 3. Filter to those where I haven't voted yet
      return (cps || []).filter(
        (cp: any) =>
          !(cp.committee_votes || []).some((v: any) => v.user_id === user!.id)
      );
    },
    enabled: !!user,
  });

  // Section 5: Unread notifications (user_id = me, is_read = false, newest first, limit 5)
  const { data: unreadNotifs = [] } = useQuery({
    queryKey: ["inbox-unread-notifs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const allEmpty =
    pendingReviews.length === 0 &&
    activeReviews.length === 0 &&
    revisionPapers.length === 0 &&
    awaitingVotes.length === 0 &&
    unreadNotifs.length === 0;

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3">
        <InboxIcon className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">{t("inbox.title")}</h1>
      </div>

      {allEmpty ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="text-lg">{t("inbox.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Review requests awaiting reply */}
          {pendingReviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  {t("inbox.reviewRequests")}
                  <Badge variant="secondary" className="ms-auto">
                    {pendingReviews.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingReviews.map((req: any) => (
                  <Link key={req.id} to="/reviewer" className="block">
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {isAr ? req.papers?.title_ar : req.papers?.title_en}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isAr
                            ? req.papers?.journals?.title_ar
                            : req.papers?.journals?.title_en}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 shrink-0">
                        {isAr ? "معلق" : "Pending"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 2: Papers I'm reviewing now */}
          {activeReviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  {t("inbox.reviewing")}
                  <Badge variant="secondary" className="ms-auto">
                    {activeReviews.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeReviews.map((req: any) => (
                  <Link key={req.id} to={`/review/${req.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {isAr ? req.papers?.title_ar : req.papers?.title_en}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isAr
                            ? req.papers?.journals?.title_ar
                            : req.papers?.journals?.title_en}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 shrink-0">
                        {isAr ? "جارٍ" : "Active"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 3: My papers needing revision */}
          {revisionPapers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-orange-500" />
                  {t("inbox.needRevision")}
                  <Badge variant="secondary" className="ms-auto">
                    {revisionPapers.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {revisionPapers.map((paper: any) => (
                  <Link key={paper.id} to={`/papers/${paper.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {isAr ? paper.title_ar : paper.title_en}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isAr
                            ? paper.journals?.title_ar
                            : paper.journals?.title_en}
                        </p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 shrink-0">
                        {isAr ? "يحتاج مراجعة" : "Revision Required"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 4: Committee papers awaiting my vote */}
          {awaitingVotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Vote className="h-5 w-5 text-purple-500" />
                  {t("inbox.awaitingCommitteeVote")}
                  <Badge variant="secondary" className="ms-auto">
                    {awaitingVotes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {awaitingVotes.map((cp: any) => (
                  <Link key={cp.id} to={`/papers/${cp.paper_id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {isAr ? cp.papers?.title_ar : cp.papers?.title_en}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isAr
                            ? cp.committees?.name_ar
                            : cp.committees?.name_en}
                          {" · "}
                          {isAr
                            ? cp.papers?.journals?.title_ar
                            : cp.papers?.journals?.title_en}
                        </p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 shrink-0">
                        {isAr ? "بانتظار تصويتك" : "Vote needed"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 5: Unread notifications */}
          {unreadNotifs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-5 w-5 text-primary" />
                  {t("inbox.unread")}
                  <Badge variant="secondary" className="ms-auto">
                    {unreadNotifs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unreadNotifs.map((n: any) => (
                  <div
                    key={n.id}
                    className="rounded-lg border p-3 space-y-0.5"
                  >
                    <p className="text-sm font-medium">
                      {isAr ? n.title_ar : n.title_en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? n.body_ar : n.body_en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString(
                        isAr ? "ar-SA" : "en-US"
                      )}
                    </p>
                  </div>
                ))}
                <div className="pt-2 text-end">
                  <Link
                    to="/notifications"
                    className="text-sm text-primary hover:underline"
                  >
                    {t("inbox.viewAll")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
