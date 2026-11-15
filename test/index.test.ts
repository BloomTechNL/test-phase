import { afterEach, describe, expect, it } from 'vitest';
import {
  Given,
  Then,
  When,
  currentPhase,
  inGivenPhase,
  inThenPhase,
  inUnknownPhase,
  inWhenPhase,
  resetPhase,
} from '../src/index';

afterEach(() => resetPhase());

describe('test-phase', () => {
  it('starts in the unknown phase', () => {
    expect(currentPhase()).toBe('unknown');
    expect(inUnknownPhase()).toBe(true);
  });

  it.each([
    ['given', Given, inGivenPhase],
    ['when', When, inWhenPhase],
    ['then', Then, inThenPhase],
  ] as const)('%s phase is set during the callback', async (name, run, check) => {
    let seen: string | undefined;
    let flag = false;
    let unknown = true;
    await run(async () => {
      seen = currentPhase();
      flag = check();
      unknown = inUnknownPhase();
    });
    expect(seen).toBe(name);
    expect(flag).toBe(true);
    expect(unknown).toBe(false);
    expect(currentPhase()).toBe('unknown');
  });

  it('only the active phase check is true', async () => {
    const checks = await When(() => [inGivenPhase(), inWhenPhase(), inThenPhase()]);
    expect(checks).toEqual([false, true, false]);
  });

  it('supports synchronous callbacks and returns their value', async () => {
    expect(await Given(() => 42)).toBe(42);
  });

  it('returns the resolved value of async callbacks', async () => {
    expect(await When(async () => 'done')).toBe('done');
  });

  it('restores the phase when the callback throws', async () => {
    await expect(
      Then(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(currentPhase()).toBe('unknown');
  });

  it('restores the outer phase after nesting', async () => {
    const phases: string[] = [];
    await Given(async () => {
      phases.push(currentPhase());
      await When(async () => phases.push(currentPhase()));
      phases.push(currentPhase());
    });
    expect(phases).toEqual(['given', 'when', 'given']);
  });

  it('resetPhase sets the phase back to unknown', async () => {
    await Given(() => {
      resetPhase();
      expect(inUnknownPhase()).toBe(true);
    });
  });
});
