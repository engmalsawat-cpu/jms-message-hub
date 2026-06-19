import { describe, it, expect } from "vitest";
import { tally, tallyFromCounts } from "./committeeTally";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a tallyFromCounts call with sensible defaults; override per-test. */
function counts(overrides: {
  approve?: number;
  approveRevisions?: number;
  reject?: number;
  abstain?: number;
  cast?: number;
  memberCount?: number;
  mechanism?: string;
  minVotes?: number;
}) {
  const approve = overrides.approve ?? 0;
  const approveRevisions = overrides.approveRevisions ?? 0;
  const reject = overrides.reject ?? 0;
  const abstain = overrides.abstain ?? 0;
  return tallyFromCounts({
    approve,
    approveRevisions,
    reject,
    abstain,
    cast: overrides.cast ?? (approve + approveRevisions + reject + abstain),
    memberCount: overrides.memberCount ?? 3,
    mechanism: overrides.mechanism ?? "majority",
    minVotes: overrides.minVotes ?? 1,
  });
}

// ---------------------------------------------------------------------------
// QUORUM — shared by all mechanisms
// ---------------------------------------------------------------------------

describe("quorum", () => {
  it("cast < minVotes => pending (majority)", () => {
    const r = counts({ approve: 1, cast: 1, memberCount: 3, minVotes: 2 });
    expect(r.decision).toBeNull();
  });

  it("cast < minVotes => pending (unanimous)", () => {
    const r = counts({ approve: 1, cast: 1, memberCount: 3, minVotes: 2, mechanism: "unanimous" });
    expect(r.decision).toBeNull();
  });

  it("cast < minVotes => pending (weighted falls back)", () => {
    const r = counts({ approve: 1, cast: 1, memberCount: 3, minVotes: 2, mechanism: "weighted" });
    expect(r.decision).toBeNull();
  });

  it("cast === minVotes is sufficient (quorum boundary, inclusive)", () => {
    // 3 approve, cast=3 — positives*2=6 > cast=3 => approved
    const r = counts({ approve: 3, cast: 3, memberCount: 5, minVotes: 3 });
    expect(r.decision).toBe("approved");
  });

  it("returns correct counts even while pending", () => {
    const r = counts({ approve: 1, abstain: 1, cast: 2, memberCount: 5, minVotes: 3 });
    expect(r.approve).toBe(1);
    expect(r.abstain).toBe(1);
    expect(r.cast).toBe(2);
    expect(r.remaining).toBe(3);
    expect(r.decision).toBeNull();
  });

  it("approveRevisions is included in TallyResult", () => {
    const r = counts({ approve: 1, approveRevisions: 2, reject: 0, memberCount: 5, minVotes: 1 });
    expect(r.approveRevisions).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// MAJORITY — abstain NOW counted in denominator (new semantics)
// ---------------------------------------------------------------------------

describe("majority", () => {
  it("approve > half of cast => approved", () => {
    // positives=2, cast=3, 2*2=4>3 => approved
    const r = counts({ approve: 2, reject: 1, cast: 3, memberCount: 3, minVotes: 1 });
    expect(r.decision).toBe("approved");
  });

  it("reject > half of cast => rejected", () => {
    // positives=1, cast=3, reject=2, 2*2=4>3 => rejected
    const r = counts({ approve: 1, reject: 2, cast: 3, memberCount: 3, minVotes: 1 });
    expect(r.decision).toBe("rejected");
  });

  it("tie (equal approve and reject, no abstain) => null (pending) with note", () => {
    // positives=2, reject=2, cast=4; 2*2=4 not > 4; 2*2=4 not > 4 => null
    const r = counts({ approve: 2, reject: 2, cast: 4, memberCount: 4, minVotes: 1 });
    expect(r.decision).toBeNull();
    expect(r.note).toBeDefined();
  });

  // KEY NEW BEHAVIOUR: abstain now in denominator — prevents approval that old rule allowed
  it("abstain in denominator prevents approval (old rule would have approved)", () => {
    // approve=2, reject=1, abstain=2, cast=5
    // positives=2; 2*2=4 > 5? NO => not approved
    // reject=1; 1*2=2 > 5? NO => not rejected
    // => null (pending due to heavy abstentions)
    const r = counts({ approve: 2, reject: 1, abstain: 2, cast: 5, memberCount: 5, minVotes: 1 });
    expect(r.decision).toBeNull();
    // Under OLD rule (abstain excluded): approve=2 > reject=1 => would have been "approved"
    // Under NEW rule: abstain counts in denominator so no strict majority => null
  });

  it("approve_with_revisions counts as positive toward majority", () => {
    // approve=1, approveRevisions=2, reject=1, abstain=0, cast=4
    // positives=3; 3*2=6 > 4 => approved
    const r = counts({ approve: 1, approveRevisions: 2, reject: 1, cast: 4, memberCount: 4, minVotes: 1 });
    expect(r.decision).toBe("approved");
  });

  it("approve_with_revisions alone can reach majority", () => {
    // approveRevisions=3, reject=1, cast=4; positives=3; 3*2=6>4 => approved
    const r = counts({ approveRevisions: 3, reject: 1, cast: 4, memberCount: 4, minVotes: 1 });
    expect(r.decision).toBe("approved");
  });

  it("all abstain => null (no strict majority for either side)", () => {
    // positives=0; 0*2=0 not > 3; reject=0; 0*2=0 not > 3 => null
    const r = counts({ abstain: 3, cast: 3, memberCount: 3, minVotes: 1 });
    expect(r.decision).toBeNull();
  });

  it("exact half positives is not a strict majority => null", () => {
    // positives=2, cast=4; 2*2=4 not > 4 => null (not strictly greater)
    const r = counts({ approve: 2, abstain: 2, cast: 4, memberCount: 4, minVotes: 1 });
    expect(r.decision).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// UNANIMOUS
// ---------------------------------------------------------------------------

describe("unanimous", () => {
  it("pending while not all members have voted", () => {
    // 2/3 voted, both approve — still waiting for the 3rd
    const r = counts({ approve: 2, cast: 2, memberCount: 3, minVotes: 1, mechanism: "unanimous" });
    expect(r.decision).toBeNull();
  });

  it("all members voted approve => approved", () => {
    const r = counts({ approve: 3, cast: 3, memberCount: 3, minVotes: 1, mechanism: "unanimous" });
    expect(r.decision).toBe("approved");
  });

  it("all members voted approve or approve_with_revisions (no reject/abstain) => approved", () => {
    // reject=0, abstain=0 => unanimously positive
    const r = counts({ approve: 2, approveRevisions: 1, cast: 3, memberCount: 3, minVotes: 1, mechanism: "unanimous" });
    expect(r.decision).toBe("approved");
  });

  it("any reject after all voted => rejected", () => {
    const r = counts({ approve: 2, reject: 1, cast: 3, memberCount: 3, minVotes: 1, mechanism: "unanimous" });
    expect(r.decision).toBe("rejected");
  });

  it("abstain with all voted => rejected (abstain counts against unanimity)", () => {
    // Old: null. NEW: abstain counts against, so => rejected when all voted
    const r = counts({ approve: 2, abstain: 1, cast: 3, memberCount: 3, minVotes: 1, mechanism: "unanimous" });
    expect(r.decision).toBe("rejected");
  });

  it("memberCount === 0 => null even if quorum passed", () => {
    const r = tallyFromCounts({
      approve: 0, approveRevisions: 0, reject: 0, abstain: 0, cast: 0,
      memberCount: 0, mechanism: "unanimous", minVotes: 0,
    });
    expect(r.decision).toBeNull();
  });

  it("cast === 0 with minVotes 0 => null (no votes, no positive decision)", () => {
    const r = tallyFromCounts({
      approve: 0, approveRevisions: 0, reject: 0, abstain: 0, cast: 0,
      memberCount: 3, mechanism: "unanimous", minVotes: 0,
    });
    expect(r.decision).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// WEIGHTED (falls back to majority)
// ---------------------------------------------------------------------------

describe("weighted (fallback to majority)", () => {
  it("returns majority-style decision and includes note", () => {
    // approve=2, cast=3; positives=2; 2*2=4>3 => approved
    const r = counts({ approve: 2, reject: 1, cast: 3, memberCount: 3, minVotes: 1, mechanism: "weighted" });
    expect(r.decision).toBe("approved");
    expect(r.note).toBeDefined();
    expect(r.note).toContain("weighted");
  });

  it("does not throw on any input", () => {
    expect(() =>
      counts({ approve: 0, approveRevisions: 0, reject: 0, abstain: 0, cast: 0, memberCount: 0, minVotes: 0, mechanism: "weighted" })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// tally() array wrapper — ensure delegation is correct
// ---------------------------------------------------------------------------

describe("tally() array wrapper", () => {
  it("produces same result as tallyFromCounts for majority", () => {
    const votes = ["approve", "approve", "reject"] as const;
    const arr = tally({ votes: [...votes], memberCount: 3, mechanism: "majority", minVotes: 2 });
    const cnt = tallyFromCounts({ approve: 2, approveRevisions: 0, reject: 1, abstain: 0, cast: 3, memberCount: 3, mechanism: "majority", minVotes: 2 });
    expect(arr).toEqual(cnt);
  });

  it("counts votes correctly from array including approve_with_revisions", () => {
    const r = tally({
      votes: ["approve", "approve_with_revisions", "approve_with_revisions", "abstain"],
      memberCount: 4,
      mechanism: "majority",
      minVotes: 1,
    });
    expect(r.approve).toBe(1);
    expect(r.approveRevisions).toBe(2);
    expect(r.abstain).toBe(1);
    expect(r.cast).toBe(4);
    expect(r.remaining).toBe(0);
    // positives=3, cast=4; 3*2=6>4 => approved
    expect(r.decision).toBe("approved");
  });

  it("approve_with_revisions counted as positive in tally() array", () => {
    const r = tally({
      votes: ["approve_with_revisions", "approve_with_revisions", "reject"],
      memberCount: 3,
      mechanism: "majority",
      minVotes: 1,
    });
    // positives=2, cast=3; 2*2=4>3 => approved
    expect(r.decision).toBe("approved");
    expect(r.approveRevisions).toBe(2);
  });

  it("decision is only approved | rejected | null — no third outcome", () => {
    const cases = [
      tally({ votes: ["approve_with_revisions", "approve_with_revisions", "approve"], memberCount: 3, mechanism: "majority", minVotes: 1 }),
      tally({ votes: ["reject", "reject"], memberCount: 3, mechanism: "majority", minVotes: 1 }),
      tally({ votes: ["abstain", "abstain", "abstain"], memberCount: 3, mechanism: "majority", minVotes: 1 }),
    ];
    for (const r of cases) {
      expect(["approved", "rejected", null]).toContain(r.decision);
    }
  });
});
