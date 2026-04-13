import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { parseTypeScript, parsePython } from '../src/parsers/regex-parser';

const fixtureDir = path.resolve(__dirname, '../fixtures');

describe('TypeScript parser', () => {
  it('extracts function definitions', () => {
    const code = `
export function add(a: number, b: number): number {
  return a + b;
}

export const multiply = (a: number, b: number): number => {
  return a * b;
};
    `;
    const result = parseTypeScript('test.ts', code);
    const names = result.nodes.map((n) => n.name);
    expect(names).toContain('add');
    expect(names).toContain('multiply');
  });

  it('marks exported functions', () => {
    const code = `export function foo() {} \n function bar() {}`;
    const result = parseTypeScript('test.ts', code);
    const foo = result.nodes.find((n) => n.name === 'foo');
    const bar = result.nodes.find((n) => n.name === 'bar');
    expect(foo?.isExported).toBe(true);
    expect(bar?.isExported).toBe(false);
  });

  it('extracts function calls', () => {
    const code = `
function a() {}
function b() { a(); }
`;
    const result = parseTypeScript('test.ts', code);
    const callees = result.calls.map((c) => c.callee);
    expect(callees).toContain('a');
  });

  it('extracts imports', () => {
    const code = `import { foo, bar } from './utils';`;
    const result = parseTypeScript('test.ts', code);
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].symbols).toContain('foo');
    expect(result.imports[0].to).toBe('./utils');
  });

  it('handles empty file', () => {
    const result = parseTypeScript('empty.ts', '');
    expect(result.nodes).toHaveLength(0);
    expect(result.calls).toHaveLength(0);
  });
});

describe('Python parser', () => {
  it('extracts function definitions', () => {
    const code = `
def add(a, b):
    return a + b

async def fetch(url):
    pass
`;
    const result = parsePython('test.py', code);
    const names = result.nodes.map((n) => n.name);
    expect(names).toContain('add');
    expect(names).toContain('fetch');
  });

  it('extracts class definitions', () => {
    const code = `class Foo:\n    def bar(self): pass\n`;
    const result = parsePython('test.py', code);
    const names = result.nodes.map((n) => n.name);
    expect(names).toContain('Foo');
  });

  it('extracts function calls', () => {
    const code = `
def b():
    a()
`;
    const result = parsePython('test.py', code);
    const callees = result.calls.map((c) => c.callee);
    expect(callees).toContain('a');
  });
});
