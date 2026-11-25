# test-phase

Know whether your test code is running in the **given**, **when** or **then** phase.

Wrap the sections of a test in `Given`, `When` and `Then`. While a section runs,
functions such as `inGivenPhase()` report which phase is active, so helpers, fakes and fixtures can
change what they do. For example, a fake can allow setup calls during `given` and
reject them during `when`.

## Install

```bash
npm install --save-dev @bloom-group/test-phase
```

## Usage

```ts
import { Given, When, Then } from '@bloom-group/test-phase';

it('places an order', async () => {
  await Given(async () => {
    await repository.add(product);
  });

  await When(async () => {
    await shop.placeOrder(product.id);
  });

  await Then(async () => {
    expect(await orders.count()).toBe(1);
  });
});
```

Anywhere in your code you can check the phase:

```ts
import { inGivenPhase } from '@bloom-group/test-phase';

class FakeClock {
  set(time: Date) {
    if (!inGivenPhase()) {
      throw new Error('The clock may only be set in the given phase');
    }
    this.time = time;
  }
}
```

## API

### `Given(fn)`, `When(fn)`, `Then(fn)`

Each one runs `fn` in that phase and returns a promise
of whatever `fn` returns. `fn` can be sync or async. When `fn` finishes or throws,
the phase goes back to what it was before, so nested calls work too.

### Checking the phase

| Function           | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `currentPhase()`   | The current phase: `'unknown' \| 'given' \| 'when' \| 'then'` |
| `inUnknownPhase()` | `true` when no phase is active                                  |
| `inGivenPhase()`   | `true` during `Given`                                           |
| `inWhenPhase()`    | `true` during `When`                                            |
| `inThenPhase()`    | `true` during `Then`                                            |
| `resetPhase()`     | Sets the phase back to `'unknown'`                              |

### `Phase`

The type `'unknown' | 'given' | 'when' | 'then'`.

## ESLint plugin

`@bloom-group/test-phase/eslint-plugin` ships two rules. The `recommended` config turns both on
as errors:

```ts
// eslint.config.js
import testPhase from '@bloom-group/test-phase/eslint-plugin';

export default [
  testPhase.configs.recommended,
];
```

Or pick the rules yourself:

```ts
import testPhase from '@bloom-group/test-phase/eslint-plugin';

export default [
  {
    plugins: { 'test-phase': testPhase },
    rules: {
      'test-phase/no-assertions-in-given-or-when': 'error',
      'test-phase/one-given-when-then-per-test': 'error',
    },
  },
];
```

The plugin needs ESLint 10 or later.

### `no-assertions-in-given-or-when`

Reports assertions inside `Given(...)` and `When(...)`. `Given` only sets up the
situation, `When` only performs the action, and asserting belongs in `Then(...)`.

```ts
Given(() => {
  expect(cart.items).toHaveLength(0); // ✗ Do not assert (expect) inside Given(...)
});

When(async () => {
  await cart.add(product);
  assert.ok(cart.total > 0); // ✗ Do not assert (assert) inside When(...)
});

Then(() => {
  expect(cart.items).toHaveLength(1); // ✓
});
```

An assertion counts when one of the configured names is called (`expect(x)`)
or has a property accessed (`assert.equal(...)`, `expect.soft(...)`). The nearest
enclosing phase decides, so a `Then` nested inside a `When` is allowed.

| Option       | Default                | Description                          |
| ------------ | ---------------------- | ------------------------------------ |
| `assertions` | `['expect', 'assert']` | Identifiers that count as assertions |

```ts
rules: {
  'test-phase/no-assertions-in-given-or-when': ['error', { assertions: ['expect', 'Ensure'] }],
}
```

### `one-given-when-then-per-test`

Reports a test that calls `Given(...)`, `When(...)` or `Then(...)` more than once.
Each test sets up one situation, performs one action and checks one outcome.

```ts
it('places an order', async () => {
  await Given(() => repository.add(product));
  await When(() => shop.placeOrder(product.id));
  await Then(() => expect(orders.count()).toBe(1));
  await When(() => shop.cancel(product.id)); // ✗ This test has 2 When(...) calls
  await Then(() => expect(orders.count()).toBe(0)); // ✗ This test has 2 Then(...) calls
});
```

Each phase is counted on its own, and every call after the first is reported.
A test is a call to `it(...)` or `test(...)`, including modifiers such as `it.only`
and `test.skip`, that has a function argument. `it.todo` is ignored, as are phases
called outside a test (for example directly in `describe`). The rule has no options.

## Caveats

- **The phase is global.** It lives in one shared variable. Tests that run
  concurrently in the same process (for example `it.concurrent`) can see each
  other's phase. Tests run one after another work fine.

## Why capitalized?

A module that exports a function named `then` is treated as a Promise by `import()`,
which breaks loaders such as Vitest. `Then` avoids that, and the capitalized names
match Cucumber's `Given` / `When` / `Then`.

## License

MIT
