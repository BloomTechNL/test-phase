import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import plugin from '../src/eslint-plugin';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const rule = plugin.rules['no-assertions-in-given-or-when'];
const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-assertions-in-given-or-when', rule, {
  valid: [
    'Then(() => { expect(x).toBe(1); })',
    'Then(async () => { assert.equal(a, b); })',
    'expect(x).toBe(1)',
    'Given(() => { repo.add(item); })',
    'When(async () => { await shop.order(); })',
    // Not one of the configured assertion names
    'Given(() => { Ensure.that(x); })',
    // Lowercase helpers are not phases of this package
    'given(() => { expect(x).toBe(1); })',
    // Then nested inside When counts as Then
    'When(() => { Then(() => { expect(x).toBe(1); }); })',
    // Using the name as a plain value is not an assertion
    'Given(() => { const fn = expect; })',
    {
      code: 'Given(() => { expect(x).toBe(1); })',
      options: [{ assertions: ['Ensure'] }],
    },
  ],
  invalid: [
    {
      code: 'Given(() => { expect(x).toBe(1); })',
      errors: [{ messageId: 'assertionInGiven', data: { name: 'expect' } }],
    },
    {
      code: 'When(async () => { await doIt(); expect(result).toBe(2); })',
      errors: [{ messageId: 'assertionInWhen', data: { name: 'expect' } }],
    },
    {
      code: 'Given(() => { assert.equal(a, b); })',
      errors: [{ messageId: 'assertionInGiven', data: { name: 'assert' } }],
    },
    {
      code: 'When(() => { assert(ok); })',
      errors: [{ messageId: 'assertionInWhen', data: { name: 'assert' } }],
    },
    {
      code: 'Given(() => { expect.soft(x).toBe(1); })',
      errors: [{ messageId: 'assertionInGiven' }],
    },
    {
      code: 'Given(() => { helper(() => expect(x).toBe(1)); })',
      errors: [{ messageId: 'assertionInGiven' }],
    },
    {
      // The nearest phase decides the message
      code: 'Given(() => { When(() => { expect(x).toBe(1); }); })',
      errors: [{ messageId: 'assertionInWhen' }],
    },
    {
      code: 'Given(() => { Ensure.that(user).isLoggedIn(); })',
      options: [{ assertions: ['Ensure'] }],
      errors: [{ messageId: 'assertionInGiven', data: { name: 'Ensure' } }],
    },
    {
      code: 'Given(() => { expect(a); }); When(() => { assert(b); }); Then(() => { expect(c); });',
      errors: [{ messageId: 'assertionInGiven' }, { messageId: 'assertionInWhen' }],
    },
  ],
});

ruleTester.run('one-given-when-then-per-test', plugin.rules['one-given-when-then-per-test'], {
  valid: [
    'it("a", () => { Given(() => {}); When(() => {}); Then(() => {}); })',
    'test("a", async () => { await When(() => {}); })',
    'it("a", () => {}); it("b", () => { Then(() => {}); })',
    // One of each per test, across several tests
    'it("a", () => { Given(() => {}); When(() => {}); }); it("b", () => { Given(() => {}); When(() => {}); })',
    // Phases outside a test are not counted
    'Given(() => {}); Given(() => {}); When(() => {}); When(() => {});',
    'describe("x", () => { Then(() => {}); Then(() => {}); })',
    // todo tests are skipped
    'it.todo("a", () => { When(() => {}); When(() => {}); })',
    // Lowercase helpers are not this package's phases
    'it("a", () => { given(() => {}); given(() => {}); then(() => {}); then(() => {}); })',
    // A test without a function body is not tracked
    'it("a"); Given(() => {}); Given(() => {});',
  ],
  invalid: [
    {
      code: 'it("a", () => { Given(() => {}); Given(() => {}); })',
      errors: [{ messageId: 'multiplePhases', data: { phase: 'Given', count: '2' }, column: 34 }],
    },
    {
      code: 'it("a", () => { Given(() => {}); When(() => {}); When(() => {}); Then(() => {}); })',
      errors: [{ messageId: 'multiplePhases', data: { phase: 'When', count: '2' } }],
    },
    {
      code: 'it("a", () => { When(() => {}); Then(() => {}); When(() => {}); Then(() => {}); })',
      errors: [
        { messageId: 'multiplePhases', data: { phase: 'When', count: '2' } },
        { messageId: 'multiplePhases', data: { phase: 'Then', count: '2' } },
      ],
    },
    {
      code: 'test("a", async () => { await Then(() => {}); await Then(() => {}); await Then(() => {}); })',
      errors: [
        { messageId: 'multiplePhases', data: { phase: 'Then', count: '3' } },
        { messageId: 'multiplePhases', data: { phase: 'Then', count: '3' } },
      ],
    },
    {
      code: 'it.only("a", function () { Given(() => {}); When(() => {}); Given(() => {}); })',
      errors: [{ messageId: 'multiplePhases', data: { phase: 'Given', count: '2' } }],
    },
    {
      code: 'test.skip("a", () => { When(() => {}); When(() => {}); })',
      errors: [{ messageId: 'multiplePhases', data: { phase: 'When', count: '2' } }],
    },
    {
      code: 'describe("x", () => { it("a", () => { Given(() => {}); }); it("b", () => { Given(() => {}); Given(() => {}); }); })',
      errors: [{ messageId: 'multiplePhases', data: { phase: 'Given', count: '2' } }],
    },
    {
      // Nested calls inside the same test count too
      code: 'it("a", () => { When(() => { When(() => {}); }); })',
      errors: [{ messageId: 'multiplePhases', data: { phase: 'When', count: '2' } }],
    },
  ],
});
