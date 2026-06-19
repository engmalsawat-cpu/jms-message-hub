import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tallyFromCounts, type VoteValue, type TallyResult } from "@/lib/committeeTally";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Vote, CheckCircle, XCircle, MinusCircle, Users, BookOpenCheck } from "lucide-react";

interface Props {
  paperId: string;
  journalId: string;
}

export function CommitteeVotingPanel({ paperId, journalId: _journalId }: Props) {
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const isEditor = hasAnyRole(["admin", "editor_in_chief", "managing_editor", "hq_admin"]);

  const [myVote, setMyVote] = useState<VoteValue | "">("");
  const [justification, setJustification] = useState("");

  // Load all committee_papers for this paper, with committee details + members + votes.
  // committee_votes is still fetched here so editors can see individual votes+justifications
  // (RLS allows editors to see all votes; regular members only see their own row).
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["committee-papers", paperId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committee_papers")
        .select(`
          id,
          status,
          decision,
          notes,
          created_at,
          committees (
            id,
            name_ar,
            name_en,
            voting_mechanism,
            min_votes,
            committee_members ( id, user_id, is_head )
          ),
          committee_votes ( id, user_id, vote, justification, created_at )
        `)
        .eq("paper_id", paperId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!paperId,
  });

  // For each committee_paper, fetch the aggregate tally via the SECURITY DEFINER RPC
  // so regular committee members get accurate counts despite the RLS restriction that
  // limits committee_votes SELECT to their own row.
  // The results are keyed by committee_paper id.
  const committeePaperIds: string[] = assignments.map((a: any) => a.id);

  const { data: tallyMap = {} } = useQuery({
    queryKey: ["committee-paper-tallies", ...committeePaperIds],
    queryFn: async () => {
      const results: Record<string, TallyResult> = {};
      await Promise.all(
        committeePaperIds.map(async (cpId) => {
          const { data, error } = await supabase.rpc(
            "get_committee_paper_tally",
            { _committee_paper_id: cpId }
          );
          if (error) {
            // Fallback: all zeros — tally stays pending rather than showing stale data
            results[cpId] = {
              approve: 0,
              approveRevisions: 0,
              reject: 0,
              abstain: 0,
              cast: 0,
              remaining: 0,
              decision: null,
            };
            return;
          }
          // The RPC returns a single row (RETURNS TABLE)
          const row = Array.isArray(data) ? data[0] : data;
          const assignment = assignments.find((a: any) => a.id === cpId);
          const committee = assignment?.committees;
          const memberCount = row?.member_count ?? committee?.committee_members?.length ?? 0;
          results[cpId] = tallyFromCounts({
            approve: row?.approve_count ?? 0,
            approveRevisions: row?.approve_revisions_count ?? 0,
            reject: row?.reject_count ?? 0,
            abstain: row?.abstain_count ?? 0,
            cast: row?.cast_count ?? 0,
            memberCount,
            mechanism: committee?.voting_mechanism ?? "majority",
            minVotes: committee?.min_votes ?? 1,
          });
        })
      );
      return results;
    },
    enabled: committeePaperIds.length > 0,
  });

  const submitVote = useMutation({
    mutationFn: async ({
      committeePaperId,
      vote,
      justification,
    }: {
      committeePaperId: string;
      vote: VoteValue;
      justification: string;
    }) => {
      // Upsert — INSERT on first vote, UPDATE on re-vote (requires UPDATE policy)
      const { error } = await supabase.from("committee_votes").upsert(
        {
          committee_paper_id: committeePaperId,
          user_id: user!.id,
          vote,
          justification,
        },
        { onConflict: "committee_paper_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-papers", paperId] });
      queryClient.invalidateQueries({ queryKey: ["committee-paper-tallies"] });
      toast.success(t("committees.voteRecorded") ?? "Vote recorded");
      setMyVote("");
      setJustification("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const recordDecision = useMutation({
    mutationFn: async ({
      committeePaperId,
      decision,
      committeeName,
    }: {
      committeePaperId: string;
      decision: "approved" | "rejected";
      committeeName: string;
    }) => {
      const { error: cpErr } = await supabase
        .from("committee_papers")
        .update({ status: "decided", decision })
        .eq("id", committeePaperId);
      if (cpErr) throw cpErr;

      // Write audit entry to paper_stage_history
      const notes =
        decision === "approved"
          ? `${t("committees.decisionApproved")} (${committeeName})`
          : `${t("committees.decisionRejected")} (${committeeName})`;

      const { error: histErr } = await supabase
        .from("paper_stage_history")
        .insert({
          paper_id: paperId,
          stage_id: null,
          action: "committee_decision",
          notes,
          performed_by: user!.id,
        });
      if (histErr) throw histErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-papers", paperId] });
      queryClient.invalidateQueries({ queryKey: ["committee-paper-tallies"] });
      queryClient.invalidateQueries({ queryKey: ["paper-history", paperId] });
      toast.success(t("committees.decisionRecorded") ?? "Committee decision recorded");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return null;
  if (assignments.length === 0) return null;

  return (
    <div className="space-y-4">
      {assignments.map((assignment: any) => {
        const committee = assignment.committees;
        if (!committee) return null;

        const members: any[] = committee.committee_members || [];
        // committee_votes here is limited by RLS to the caller's own row for
        // regular members, or all rows for editors. Used only for:
        //   (a) finding the member's own existing vote to pre-fill the form
        //   (b) showing the editor the full vote list + justifications
        const votes: any[] = assignment.committee_votes || [];
        const isMyCommittee = members.some((m: any) => m.user_id === user?.id);

        // My existing vote — readable by the member themselves via RLS
        const existingVote = votes.find((v: any) => v.user_id === user?.id);

        // Use the RPC-based tally so all roles see the correct aggregate
        const result: TallyResult = tallyMap[assignment.id] ?? {
          approve: 0,
          approveRevisions: 0,
          reject: 0,
          abstain: 0,
          cast: 0,
          remaining: 0,
          decision: null,
        };

        // Committee display name — show both scripts when available
        const committeeDisplayName =
          committee.name_ar && committee.name_en
            ? `${committee.name_ar} / ${committee.name_en}`
            : committee.name_en || committee.name_ar;

        const decisionBg =
          assignment.decision === "approved"
            ? "bg-green-50 border-green-300 dark:bg-green-950/20"
            : assignment.decision === "rejected"
            ? "bg-red-50 border-red-300 dark:bg-red-950/20"
            : "";

        const memberCount =
          result.cast + result.remaining > 0
            ? result.cast + result.remaining
            : members.length;

        return (
          <Card key={assignment.id} className={decisionBg}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Vote className="h-5 w-5 text-primary" />
                {committeeDisplayName}
                {assignment.status === "decided" && assignment.decision && (
                  <Badge
                    className={
                      assignment.decision === "approved"
                        ? "bg-green-100 text-green-800 ms-auto"
                        : "bg-red-100 text-red-800 ms-auto"
                    }
                  >
                    {assignment.decision === "approved"
                      ? t("committees.approved")
                      : t("committees.rejected")}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Decision banner */}
              {assignment.status === "decided" && assignment.decision && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    assignment.decision === "approved"
                      ? "border-green-300 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
                      : "border-red-300 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
                  }`}
                >
                  {assignment.decision === "approved" ? (
                    <CheckCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0" />
                  )}
                  <p className="font-medium">
                    {assignment.decision === "approved"
                      ? t("committees.decisionApproved")
                      : t("committees.decisionRejected")}
                  </p>
                </div>
              )}

              {/* Tally summary — driven by RPC counts, safe for all roles */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{result.approve}</span>
                  <span className="text-muted-foreground">
                    {t("committees.tallyApprove")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpenCheck className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{result.approveRevisions}</span>
                  <span className="text-muted-foreground">
                    {t("committees.tallyApproveRevisions")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium">{result.reject}</span>
                  <span className="text-muted-foreground">
                    {t("committees.tallyReject")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MinusCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{result.abstain}</span>
                  <span className="text-muted-foreground">
                    {t("committees.tallyAbstain")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {result.cast}/{memberCount}{" "}
                    {t("committees.voted")}
                  </span>
                </div>
                {result.decision && assignment.status !== "decided" && (
                  <Badge
                    className={
                      result.decision === "approved"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {result.decision === "approved"
                      ? t("committees.outcomeApproved")
                      : t("committees.outcomeRejected")}
                  </Badge>
                )}
                {!result.decision && assignment.status !== "decided" && (
                  <Badge variant="secondary">{t("committees.pending")}</Badge>
                )}
              </div>

              {result.note && (
                <p className="text-xs text-muted-foreground italic">
                  {result.note}
                </p>
              )}

              {/* Vote form — committee members only */}
              {isMyCommittee && assignment.status !== "decided" && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {existingVote
                        ? t("committees.updateVote")
                        : t("committees.castVote")}
                    </p>
                    {existingVote && (
                      <p className="text-xs text-muted-foreground">
                        {t("committees.currentVote")}{" "}
                        <span className="font-medium">
                          {existingVote.vote === "approve"
                            ? t("committees.voteApprove")
                            : existingVote.vote === "approve_with_revisions"
                            ? t("committees.voteApproveRevisions")
                            : existingVote.vote === "reject"
                            ? t("committees.voteReject")
                            : t("committees.voteAbstain")}
                        </span>
                      </p>
                    )}
                    {/* Vote buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {(["approve", "approve_with_revisions", "reject", "abstain"] as VoteValue[]).map(
                        (v) => (
                          <Button
                            key={v}
                            variant={myVote === v ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              setMyVote((prev) => (prev === v ? "" : v))
                            }
                            className={
                              myVote === v
                                ? v === "approve"
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : v === "approve_with_revisions"
                                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                                  : v === "reject"
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : ""
                                : v === "approve_with_revisions"
                                ? "border-amber-400 text-amber-700 hover:bg-amber-50"
                                : ""
                            }
                          >
                            {v === "approve"
                              ? t("committees.voteApprove")
                              : v === "approve_with_revisions"
                              ? t("committees.voteApproveRevisions")
                              : v === "reject"
                              ? t("committees.voteReject")
                              : t("committees.voteAbstain")}
                          </Button>
                        )
                      )}
                    </div>
                    {/* Justification */}
                    <div className="space-y-1">
                      <Label className="text-sm">
                        {t("committees.justification")}
                      </Label>
                      <Textarea
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        rows={3}
                        placeholder={t("committees.justificationPlaceholder")}
                      />
                    </div>
                    <Button
                      disabled={
                        !myVote ||
                        !justification.trim() ||
                        submitVote.isPending
                      }
                      onClick={() =>
                        submitVote.mutate({
                          committeePaperId: assignment.id,
                          vote: myVote as VoteValue,
                          justification: justification.trim(),
                        })
                      }
                      className="w-full"
                    >
                      {submitVote.isPending
                        ? t("common.loading")
                        : t("common.submit")}
                    </Button>
                  </div>
                </>
              )}

              {/* Editor: all votes + justifications */}
              {isEditor && votes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t("committees.recordedVotes")}
                    </p>
                    {votes.map((v: any) => (
                      <div
                        key={v.id}
                        className="rounded-lg border bg-muted/40 p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Badge
                            className={
                              v.vote === "approve"
                                ? "bg-green-100 text-green-800"
                                : v.vote === "approve_with_revisions"
                                ? "bg-amber-100 text-amber-800"
                                : v.vote === "reject"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {v.vote === "approve"
                              ? t("committees.voteApprove")
                              : v.vote === "approve_with_revisions"
                              ? t("committees.voteApproveRevisions")
                              : v.vote === "reject"
                              ? t("committees.voteReject")
                              : t("committees.voteAbstain")}
                          </Badge>
                        </div>
                        {v.justification && (
                          <p className="text-sm text-muted-foreground">
                            {v.justification}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Editor: Record decision button */}
              {isEditor && result.decision && assignment.status !== "decided" && (
                <>
                  <Separator />
                  <Button
                    onClick={() =>
                      recordDecision.mutate({
                        committeePaperId: assignment.id,
                        decision: result.decision as "approved" | "rejected",
                        committeeName: committeeDisplayName,
                      })
                    }
                    disabled={recordDecision.isPending}
                    className="w-full"
                    variant={
                      result.decision === "approved" ? "default" : "destructive"
                    }
                  >
                    {recordDecision.isPending
                      ? t("common.loading")
                      : result.decision === "approved"
                      ? `${t("committees.recordDecision")}: ${t("committees.approved")}`
                      : `${t("committees.recordDecision")}: ${t("committees.rejected")}`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
