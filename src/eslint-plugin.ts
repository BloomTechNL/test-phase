import type { ESLint, Rule } from 'eslint';

type Node = Rule.Node;

const DEFAULT_ASSERTIONS = ['expect', 'assert'];
const PHASES = ['Given', 'When', 'Then'] as const;
type PhaseName = (typeof PHASES)[number];

function phaseCallName(node: Node): PhaseName | undefined {
  if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') return undefined;
  const name = node.callee.name;
  return (PHASES as readonly string[]).includes(name) ? (name as PhaseName) : undefined;
}

/** Returns the nearest enclosing `Given(...)`, `When(...)` or `Then(...)` call, if any. */
function enclosingPhase(node: Node): PhaseName | undefined {
  for (let current: Node | null = node.parent; current; current = current.parent) {
    const phase = phaseCallName(current);
    if (phase) return phase;
  }
  return undefined;
}

const noAssertionsInGivenOrWhen: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow assertions inside Given(...) and When(...); assert only inside Then(...)',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          assertions: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      assertionInGiven:
        'Do not assert ({{name}}) inside Given(...). Given(...) only sets up the situation; assert inside Then(...).',
      assertionInWhen:
        'Do not assert ({{name}}) inside When(...). When(...) only performs the action; assert inside Then(...).',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as { assertions?: string[] };
    const assertions = new Set(options.assertions ?? DEFAULT_ASSERTIONS);

    function check(identifier: Node & { name: string }) {
      if (!assertions.has(identifier.name)) return;
      const phase = enclosingPhase(identifier);
      if (phase !== 'Given' && phase !== 'When') return;
      context.report({
        node: identifier,
        messageId: phase === 'Given' ? 'assertionInGiven' : 'assertionInWhen',
        data: { name: identifier.name },
      });
    }

    return {
      // expect(x), assert(x)
      'CallExpression > Identifier.callee'(node: Node & { name: string }) {
        check(node);
      },
      // assert.equal(...), expect.soft(...), Ensure.that(...)
      'MemberExpression > Identifier.object'(node: Node & { name: string }) {
        check(node);
      },
    };
  },
};

const TEST_NAMES = new Set(['it', 'test']);
const SKIPPED_MODIFIERS = new Set(['todo']);

/** `true` for `it(...)`, `test(...)` and modifiers such as `it.only(...)`, but not `it.todo(...)`. */
function isTestCall(node: Node & { type: 'CallExpression' }): boolean {
  const callee = node.callee;
  if (callee.type === 'Identifier') return TEST_NAMES.has(callee.name);
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    TEST_NAMES.has(callee.object.name) &&
    callee.property.type === 'Identifier' &&
    !SKIPPED_MODIFIERS.has(callee.property.name)
  );
}

function isFunction(node: { type: string }): boolean {
  return node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';
}

type CallNode = Node & { type: 'CallExpression' };

const oneOfEachPhasePerTest: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that a test has at most one Given(...), one When(...) and one Then(...)',
      recommended: true,
    },
    schema: [],
    messages: {
      multiplePhases:
        'This test has {{ count }} {{ phase }}(...) calls. Use at most one {{ phase }}(...) per test.',
    },
  },
  create(context) {
    const stack: { node: Node; calls: Record<PhaseName, CallNode[]> }[] = [];

    return {
      CallExpression(node) {
        if (isTestCall(node) && node.arguments.some(isFunction)) {
          stack.push({ node, calls: { Given: [], When: [], Then: [] } });
          return;
        }
        const phase = phaseCallName(node);
        if (phase && stack.length > 0) {
          stack[stack.length - 1].calls[phase].push(node);
        }
      },
      'CallExpression:exit'(node: Node) {
        const top = stack[stack.length - 1];
        if (!top || top.node !== node) return;
        stack.pop();
        for (const phase of PHASES) {
          const calls = top.calls[phase];
          for (const call of calls.slice(1)) {
            context.report({
              node: call.callee,
              messageId: 'multiplePhases',
              data: { phase, count: String(calls.length) },
            });
          }
        }
      },
    };
  },
};

const plugin = {
  meta: { name: '@bloom-group/test-phase' },
  rules: {
    'no-assertions-in-given-or-when': noAssertionsInGivenOrWhen,
    'one-given-when-then-per-test': oneOfEachPhasePerTest,
  },
  configs: {} as Record<string, ESLint.ConfigData | object>,
} satisfies ESLint.Plugin;

plugin.configs.recommended = {
  plugins: { 'test-phase': plugin },
  rules: {
    'test-phase/no-assertions-in-given-or-when': 'error',
    'test-phase/one-given-when-then-per-test': 'error',
  },
};

export default plugin;
