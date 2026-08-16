export interface FrameCandidate {
  readonly frameId: number;
  readonly confidence: number;
  readonly dedicated: boolean;
  readonly topFrame: boolean;
}

interface PendingCandidate extends FrameCandidate {
  readonly resolve: (granted: boolean) => void;
}

interface Batch {
  readonly candidates: PendingCandidate[];
  readonly timer: ReturnType<typeof setTimeout>;
}

interface Lease {
  readonly frameId: number;
  readonly expiresAt: number;
}

export interface FrameArbiterOptions {
  readonly decisionWindowMs?: number;
  readonly leaseMs?: number;
  readonly now?: () => number;
}

export class FrameArbiter {
  private readonly batches = new Map<number, Batch>();
  private readonly leases = new Map<number, Lease>();
  private readonly decisionWindowMs: number;
  private readonly leaseMs: number;
  private readonly now: () => number;

  constructor(options: FrameArbiterOptions = {}) {
    this.decisionWindowMs = options.decisionWindowMs ?? 75;
    this.leaseMs = options.leaseMs ?? 5_000;
    this.now = options.now ?? Date.now;
  }

  claim(tabId: number, candidate: FrameCandidate): Promise<boolean> {
    const lease = this.leases.get(tabId);
    if (lease && lease.expiresAt > this.now()) {
      return Promise.resolve(lease.frameId === candidate.frameId);
    }
    if (lease) this.leases.delete(tabId);

    return new Promise((resolve) => {
      const pending: PendingCandidate = { ...candidate, resolve };
      const batch = this.batches.get(tabId);
      if (batch) {
        batch.candidates.push(pending);
        return;
      }
      const candidates = [pending];
      const timer = setTimeout(() => this.decide(tabId), this.decisionWindowMs);
      this.batches.set(tabId, { candidates, timer });
    });
  }

  release(tabId: number): void {
    const batch = this.batches.get(tabId);
    if (batch) {
      clearTimeout(batch.timer);
      for (const candidate of batch.candidates) candidate.resolve(false);
      this.batches.delete(tabId);
    }
    this.leases.delete(tabId);
  }

  private decide(tabId: number): void {
    const batch = this.batches.get(tabId);
    if (!batch) return;
    this.batches.delete(tabId);
    const ranked = [...batch.candidates].sort(
      (left, right) =>
        Number(right.dedicated) - Number(left.dedicated) ||
        right.confidence - left.confidence ||
        Number(right.topFrame) - Number(left.topFrame) ||
        left.frameId - right.frameId,
    );
    const winner = ranked[0];
    if (!winner) return;
    this.leases.set(tabId, {
      frameId: winner.frameId,
      expiresAt: this.now() + this.leaseMs,
    });
    for (const candidate of batch.candidates) candidate.resolve(candidate === winner);
  }
}
