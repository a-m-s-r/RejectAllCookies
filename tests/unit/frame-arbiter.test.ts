import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrameArbiter } from '../../src/platform/frame-arbiter';

describe('frame arbitration', () => {
  afterEach(() => vi.useRealTimers());

  it('prefers a dedicated adapter over a higher-confidence generic surface', async () => {
    vi.useFakeTimers();
    const arbiter = new FrameArbiter({ decisionWindowMs: 50 });
    const generic = arbiter.claim(1, {
      frameId: 0,
      confidence: 95,
      dedicated: false,
      topFrame: true,
    });
    const dedicated = arbiter.claim(1, {
      frameId: 3,
      confidence: 80,
      dedicated: true,
      topFrame: false,
    });
    await vi.advanceTimersByTimeAsync(50);
    await expect(generic).resolves.toBe(false);
    await expect(dedicated).resolves.toBe(true);
  });

  it('uses confidence, top-frame status, then frame id as stable tie breakers', async () => {
    vi.useFakeTimers();
    const arbiter = new FrameArbiter({ decisionWindowMs: 10 });
    const lower = arbiter.claim(2, {
      frameId: 4,
      confidence: 70,
      dedicated: false,
      topFrame: false,
    });
    const top = arbiter.claim(2, {
      frameId: 0,
      confidence: 90,
      dedicated: false,
      topFrame: true,
    });
    await vi.advanceTimersByTimeAsync(10);
    await expect(lower).resolves.toBe(false);
    await expect(top).resolves.toBe(true);
  });

  it('holds a lease for the winning frame and clears it on release', async () => {
    vi.useFakeTimers();
    const arbiter = new FrameArbiter({ decisionWindowMs: 10 });
    const first = arbiter.claim(7, {
      frameId: 2,
      confidence: 100,
      dedicated: true,
      topFrame: false,
    });
    await vi.advanceTimersByTimeAsync(10);
    await expect(first).resolves.toBe(true);
    await expect(
      arbiter.claim(7, { frameId: 1, confidence: 100, dedicated: true, topFrame: true }),
    ).resolves.toBe(false);
    arbiter.release(7);
    const replacement = arbiter.claim(7, {
      frameId: 1,
      confidence: 100,
      dedicated: true,
      topFrame: true,
    });
    await vi.advanceTimersByTimeAsync(10);
    await expect(replacement).resolves.toBe(true);
  });
});
