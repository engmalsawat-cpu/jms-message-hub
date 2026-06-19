/**
 * committeeTally.ts
 * Pure tally logic for committee voting — no React, no Supabase.
 * QA may run this under a unit-test runner directly.
 */

export type VoteValue = "approve" | "approve_with_revisions" | "reject" | "abstain";

export type TallyDecision = "approved" | "rejected" | null;

export interface TallyInput {
  /** Raw vote values cast by members */
  votes: VoteValue[];
  /** Total number of committee members (used for quorum / unanimous checks) */
  memberCount: number;
  /** Voting rule: 'majority' | 'unanimous' | 'weighted' */
  mechanism: string;
  /** Minimum number of votes that must be cast before any decision is possible */
  minVotes: number;
}

export interface TallyCountInput {
  approve: number;
  /** Votes of "approve with revisions" — counted as positive (same side as approve) */
  approveRevisions: number;
  reject: number;
  abstain: number;
  /** Total votes already cast (approve + approveRevisions + reject + abstain) */
  cast: number;
  /** Total number of committee members */
  memberCount: number;
  /** Voting rule: 'majority' | 'unanimous' | 'weighted' */
  mechanism: string;
  /** Minimum number of votes that must be cast before any decision is possible */
  minVotes: number;
}

export interface TallyResult {
  approve: number;
  /** Votes of "approve with revisions" */
  approveRevisions: number;
  reject: number;
  abstain: number;
  /** Total votes cast */
  cast: number;
  /** Members who have not yet voted */
  remaining: number;
  /** Resolved decision, or null when still pending */
  decision: TallyDecision;
  /** Optional human-readable note (e.g. tie, weighted fallback, pending reason) */
  note?: string;
}

/**
 * Compute the tally for a committee vote, driven by aggregate counts.
 *
 * Quorum rule (shared by all mechanisms):
 *   If cast < minVotes → decision = null (pending), regardless of counts.
 *
 * majority (abstain NOW counted in denominator):
 *   positives = approve + approveRevisions
 *   cast = approve + approveRevisions + reject + abstain (all cast votes)
 *   After quorum:
 *     if positives * 2 > cast  → 'approved'   (strict majority of ALL cast votes)
 *     if reject * 2 > cast     → 'rejected'
 *     else                     → null (pending — tie or heavy abstentions)
 *
 * unanimous:
 *   Decision is 'approved' only when:
 *     - memberCount > 0 AND cast > 0 AND
 *     - cast >= minVotes AND
 *     - all members have voted (cast === memberCount) AND
 *     - every vote is positive (reject === 0, abstain === 0)
 *   If cast === memberCount AND (reject > 0 OR abstain > 0) → 'rejected'
 *     (abstain counts against unanimity)
 *   Otherwise → null
 *
 * weighted:
 *   Out of scope — falls back to majority logic with a note. Does not throw.
 */
export function tallyFromCounts({
  approve,
  approveRevisions,
  reject,
  abstain,
  cast,
  memberCount,
  mechanism,
  minVotes,
}: TallyCountInput): TallyResult {
  const remaining = Math.max(0, memberCount - cast);

  // Quorum not reached
  if (cast < minVotes) {
    return { approve, approveRevisions, reject, abstain, cast, remaining, decision: null };
  }

  const effectiveMechanism =
    mechanism === "weighted" ? "majority" : mechanism;
  const weightedNote =
    mechanism === "weighted"
      ? "weighted not yet supported — falling back to majority"
      : undefined;

  if (effectiveMechanism === "unanimous") {
    // Guard: empty committee or no votes cast → no positive decision
    if (memberCount === 0 || cast === 0) {
      return {
        approve,
        approveRevisions,
        reject,
        abstain,
        cast,
        remaining,
        decision: null,
        note: weightedNote,
      };
    }
    // Needs every member to have voted
    if (cast < memberCount) {
      return {
        approve,
        approveRevisions,
        reject,
        abstain,
        cast,
        remaining,
        decision: null,
        note: weightedNote,
      };
    }
    // All members voted
    if (reject === 0 && abstain === 0) {
      // Every vote was a positive (approve or approve_with_revisions)
      return {
        approve,
        approveRevisions,
        reject,
        abstain,
        cast,
        remaining,
        decision: "approved",
        note: weightedNote,
      };
    }
    // Any reject OR abstain breaks unanimity — abstain counts against
    return {
      approve,
      approveRevisions,
      reject,
      abstain,
      cast,
      remaining,
      decision: "rejected",
      note: weightedNote,
    };
  }

  // majority (default): abstain is IN the denominator
  const positives = approve + approveRevisions;

  if (positives * 2 > cast) {
    return {
      approve,
      approveRevisions,
      reject,
      abstain,
      cast,
      remaining,
      decision: "approved",
      note: weightedNote,
    };
  }
  if (reject * 2 > cast) {
    return {
      approve,
      approveRevisions,
      reject,
      abstain,
      cast,
      remaining,
      decision: "rejected",
      note: weightedNote,
    };
  }
  // Tie or heavy abstentions — no strict majority
  const pendingNote = weightedNote ?? "no strict majority — pending";
  return {
    approve,
    approveRevisions,
    reject,
    abstain,
    cast,
    remaining,
    decision: null,
    note: pendingNote,
  };
}

/**
 * Compute the tally from a raw votes array.
 * Delegates to tallyFromCounts after counting.
 */
export function tally({
  votes,
  memberCount,
  mechanism,
  minVotes,
}: TallyInput): TallyResult {
  const approve = votes.filter((v) => v === "approve").length;
  const approveRevisions = votes.filter((v) => v === "approve_with_revisions").length;
  const reject = votes.filter((v) => v === "reject").length;
  const abstain = votes.filter((v) => v === "abstain").length;
  const cast = votes.length;
  return tallyFromCounts({
    approve,
    approveRevisions,
    reject,
    abstain,
    cast,
    memberCount,
    mechanism,
    minVotes,
  });
}
