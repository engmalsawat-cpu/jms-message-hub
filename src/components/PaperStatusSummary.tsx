import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";

interface Props {
  paperId: string;
  paperStatus: string;
  isEditor: boolean;
}

type RowState = "done" | "pending" | "todo";

function StateIcon({ state }: { state: RowState }) {
  if (state === "done") return <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />;
  if (state === "pending") return <Clock className="h-5 w-5 text-amber-600 shrink-0" />;
  return <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />;
}

export function PaperStatusSummary({ paperId, paperStatus, isEditor }: Props) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const { data } = useQuery({
    queryKey: ["paper-status-summary", paperId],
    queryFn: async () => {
      const [reqs, reports, cps, decisions] = await Promise.all([
        supabase.from("review_requests").select("id, status").eq("paper_id", paperId),
        supabase.from("review_reports").select("id, is_submitted, recommendation").eq("paper_id", paperId),
        supabase.from("committee_papers").select("id").eq("paper_id", paperId),
        supabase.from("author_decisions").select("id, decision, created_at, acknowledged_at").eq("paper_id", paperId).order("created_at", { ascending: false }),
      ]);

      const committeeIds = (cps.data || []).map((c) => c.id);
      let votes: any[] = [];
      let memberCount = 0;
      if (committeeIds.length > 0) {
        const { data: v } = await supabase
          .from("committee_votes")
          .select("vote, committee_paper_id")
          .in("committee_paper_id", committeeIds);
        votes = v || [];
        // members tally via RPC for first committee
        const { data: tally } = await supabase.rpc("get_committee_paper_tally", { _committee_paper_id: committeeIds[0] });
        memberCount = (tally && tally[0]?.member_count) || 0;
      }

      return {
        reviewRequests: reqs.data || [],
        reviewReports: reports.data || [],
        committeePapers: cps.data || [],
        votes,
        memberCount,
        decisions: decisions.data || [],
      };
    },
  });

  if (!data) return null;

  // 1. Reviewers
  const totalReqs = data.reviewRequests.length;
  const acceptedReqs = data.reviewRequests.filter((r) => ["accepted", "completed"].includes(r.status)).length;
  const submittedReports = data.reviewReports.filter((r) => r.is_submitted).length;
  let reviewersState: RowState = "todo";
  let reviewersText: string;
  if (totalReqs === 0) {
    reviewersText = isAr ? "لم تتم دعوة محكمين بعد" : "No reviewers invited yet";
  } else if (submittedReports >= totalReqs && totalReqs > 0) {
    reviewersState = "done";
    reviewersText = isAr ? `اكتملت كل التقارير (${submittedReports}/${totalReqs})` : `All reports submitted (${submittedReports}/${totalReqs})`;
  } else if (submittedReports > 0) {
    reviewersState = "pending";
    reviewersText = isAr ? `استُلم ${submittedReports} من ${totalReqs} تقرير` : `${submittedReports} of ${totalReqs} reports received`;
  } else {
    reviewersState = "pending";
    reviewersText = isAr ? `بانتظار التقارير (قبل ${acceptedReqs} من ${totalReqs})` : `Awaiting reports (${acceptedReqs}/${totalReqs} accepted)`;
  }

  // 2. Committee
  let committeeState: RowState = "todo";
  let committeeText: string;
  if (data.committeePapers.length === 0) {
    committeeText = isAr ? "لم يُرسل البحث إلى لجنة بعد" : "Not yet sent to a committee";
  } else {
    const castCount = data.votes.length;
    const approves = data.votes.filter((v) => v.vote === "approve" || v.vote === "approve_with_revisions").length;
    if (data.memberCount > 0 && castCount >= data.memberCount) {
      committeeState = "done";
      committeeText = isAr
        ? `اكتمل التصويت (${approves}/${castCount} موافقة)`
        : `Voting complete (${approves}/${castCount} approve)`;
    } else {
      committeeState = "pending";
      committeeText = isAr
        ? `صوّت ${castCount} من ${data.memberCount || "?"} عضو`
        : `${castCount} of ${data.memberCount || "?"} members voted`;
    }
  }

  // 3. Decision to author
  const lastDecision = data.decisions[0];
  let decisionState: RowState = "todo";
  let decisionText: string;
  if (!lastDecision) {
    decisionText = isAr ? "لم يُرسل قرار للباحث بعد" : "No decision sent to author yet";
  } else {
    decisionState = "done";
    const dateStr = new Date(lastDecision.created_at).toLocaleDateString(isAr ? "ar-SA" : "en-US");
    decisionText = isAr
      ? `أُرسل القرار (${lastDecision.decision}) في ${dateStr}`
      : `Decision (${lastDecision.decision}) sent on ${dateStr}`;
  }

  // 4. Author response
  let authorState: RowState = "todo";
  let authorText: string;
  if (!lastDecision) {
    authorText = isAr ? "—" : "—";
  } else if (lastDecision.acknowledged_at) {
    authorState = "done";
    authorText = isAr ? "استلم الباحث القرار" : "Author acknowledged the decision";
  } else {
    authorState = "pending";
    authorText = isAr ? "لم يستلم الباحث القرار بعد" : "Author has not opened the decision yet";
  }

  // Suggested next action (editor only)
  let nextAction: string | null = null;
  if (isEditor) {
    if (totalReqs === 0 && data.committeePapers.length === 0) {
      nextAction = isAr ? "ابدأ بدعوة محكمين أو إرسال البحث للجنة" : "Start by inviting reviewers or sending to a committee";
    } else if (submittedReports > 0 && data.committeePapers.length === 0) {
      nextAction = isAr ? "أرسل البحث إلى لجنة للتصويت" : "Send the paper to a committee for voting";
    } else if (data.committeePapers.length > 0 && data.memberCount > 0 && data.votes.length < data.memberCount) {
      nextAction = isAr ? "بانتظار اكتمال تصويت اللجنة" : "Waiting for committee voting to complete";
    } else if (data.committeePapers.length > 0 && !lastDecision) {
      nextAction = isAr ? "أرسل قرار اللجنة إلى الباحث" : "Send the committee's decision to the author";
    } else if (lastDecision && !lastDecision.acknowledged_at) {
      nextAction = isAr ? "بانتظار اطلاع الباحث على القرار" : "Waiting for the author to acknowledge";
    } else if (paperStatus === "revision_required") {
      nextAction = isAr ? "بانتظار تعديلات الباحث" : "Waiting for the author's revisions";
    }
  }

  const Row = ({ label, state, text }: { label: string; state: RowState; text: string }) => (
    <div className="flex items-start gap-3 py-2">
      <StateIcon state={state} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{isAr ? "أين نحن الآن؟" : "Where are we now?"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <Row label={isAr ? "التحكيم" : "Peer Review"} state={reviewersState} text={reviewersText} />
        <Row label={isAr ? "اللجنة" : "Committee"} state={committeeState} text={committeeText} />
        <Row label={isAr ? "قرار للباحث" : "Decision to Author"} state={decisionState} text={decisionText} />
        <Row label={isAr ? "رد الباحث" : "Author Response"} state={authorState} text={authorText} />
        {nextAction && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/40 bg-background p-3">
            <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary mb-0.5">{isAr ? "الإجراء التالي المقترح" : "Suggested Next Step"}</p>
              <p className="text-sm">{nextAction}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}