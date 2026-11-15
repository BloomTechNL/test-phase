/** The phase a test is currently in. */
export type Phase = 'unknown' | 'given' | 'when' | 'then';

let phase: Phase = 'unknown';

/** Returns the phase that is currently active. */
export function currentPhase(): Phase {
  return phase;
}

/** `true` when no phase is active. */
export function inUnknownPhase(): boolean {
  return phase === 'unknown';
}

/** `true` while a `Given` callback runs. */
export function inGivenPhase(): boolean {
  return phase === 'given';
}

/** `true` while a `When` callback runs. */
export function inWhenPhase(): boolean {
  return phase === 'when';
}

/** `true` while a `Then` callback runs. */
export function inThenPhase(): boolean {
  return phase === 'then';
}

/** Sets the phase back to `'unknown'`. Handy in `afterEach` hooks. */
export function resetPhase(): void {
  phase = 'unknown';
}

async function runInPhase<T>(next: Phase, fn: () => T | Promise<T>): Promise<T> {
  const previous = phase;
  phase = next;
  try {
    return await fn();
  } finally {
    phase = previous;
  }
}

/** Runs `fn` in the `'given'` phase, restoring the previous phase afterwards. */
export function Given<T>(fn: () => T | Promise<T>): Promise<T> {
  return runInPhase('given', fn);
}

/** Runs `fn` in the `'when'` phase, restoring the previous phase afterwards. */
export function When<T>(fn: () => T | Promise<T>): Promise<T> {
  return runInPhase('when', fn);
}

/** Runs `fn` in the `'then'` phase, restoring the previous phase afterwards. */
export function Then<T>(fn: () => T | Promise<T>): Promise<T> {
  return runInPhase('then', fn);
}
