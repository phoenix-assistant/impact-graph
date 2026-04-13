import * as fs from 'fs';
import * as path from 'path';
import { FunctionNode, ImportEdge } from '../types.js';

export interface ParseResult {
  nodes: FunctionNode[];
  calls: Array<{ callee: string; line: number }>;
  imports: ImportEdge[];
}

// Regex-based fallback parser for TypeScript/JavaScript
export function parseTypeScript(filePath: string, content: string): ParseResult {
  const nodes: FunctionNode[] = [];
  const rawCalls: Array<{ callee: string; line: number }> = [];
  const imports: ImportEdge[] = [];
  const lines = content.split('\n');
  const relPath = filePath;

  const makeId = (name: string) => `${relPath}:${name}`;

  // Extract imports
  const importRegex = /^import\s+(?:\{([^}]+)\}|(\w+)|(\*\s+as\s+\w+))\s+from\s+['"]([^'"]+)['"]/;
  const requireRegex = /(?:const|let|var)\s+(?:\{([^}]+)\}|(\w+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Imports
    const im = importRegex.exec(line);
    if (im) {
      const symbols = im[1]
        ? im[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
        : im[2]
          ? [im[2]]
          : [];
      imports.push({ from: relPath, to: im[4], symbols });
      continue;
    }
    const req = requireRegex.exec(line);
    if (req) {
      const symbols = req[1]
        ? req[1].split(',').map((s) => s.trim()).filter(Boolean)
        : req[2]
          ? [req[2]]
          : [];
      imports.push({ from: relPath, to: req[3], symbols });
    }

    // Function definitions
    // export async function foo(
    const funcDecl = /(?:^|\s)(export\s+)?(async\s+)?function\s+(\w+)\s*[\(<]/;
    const m1 = funcDecl.exec(line);
    if (m1 && m1[3]) {
      nodes.push({
        id: makeId(m1[3]),
        name: m1[3],
        file: relPath,
        line: lineNum,
        type: 'function',
        isExported: !!m1[1],
      });
    }

    // Arrow functions: const foo = (...) =>  or  export const foo = ...
    const arrowDecl = /(?:^|\s)(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/;
    const m2 = arrowDecl.exec(line);
    if (m2 && m2[2] && lines.slice(i, i + 3).join(' ').includes('=>')) {
      nodes.push({
        id: makeId(m2[2]),
        name: m2[2],
        file: relPath,
        line: lineNum,
        type: 'arrow',
        isExported: !!m2[1],
      });
    }

    // Class methods: methodName(...) or async methodName(
    const methodDecl = /^\s+((?:public|private|protected|static|async|override)\s+)*(\w+)\s*\((?!.*=\s*(?:function|\())/;
    const m3 = methodDecl.exec(line);
    if (m3 && m3[2] && !['if', 'while', 'for', 'switch', 'catch'].includes(m3[2])) {
      nodes.push({
        id: makeId(m3[2]),
        name: m3[2],
        file: relPath,
        line: lineNum,
        type: 'method',
        isExported: false,
      });
    }

    // Class definitions
    const classDecl = /(export\s+)?class\s+(\w+)/;
    const m4 = classDecl.exec(line);
    if (m4 && m4[2]) {
      nodes.push({
        id: makeId(m4[2]),
        name: m4[2],
        file: relPath,
        line: lineNum,
        type: 'class',
        isExported: !!m4[1],
      });
    }

    // Function calls: identifier(
    const callRegex = /(\w+)\s*\(/g;
    const keywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'class', 'return', 'typeof', 'instanceof', 'new', 'await', 'async', 'import', 'export', 'require', 'throw', 'delete', 'void', 'in', 'of']);
    let callMatch;
    while ((callMatch = callRegex.exec(line)) !== null) {
      if (!keywords.has(callMatch[1])) {
        rawCalls.push({ callee: callMatch[1], line: lineNum });
      }
    }
  }

  // Deduplicate nodes by id (prefer first occurrence)
  const seen = new Set<string>();
  const uniqueNodes = nodes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return { nodes: uniqueNodes, calls: rawCalls, imports };
}

export function parsePython(filePath: string, content: string): ParseResult {
  const nodes: FunctionNode[] = [];
  const rawCalls: Array<{ callee: string; line: number }> = [];
  const imports: ImportEdge[] = [];
  const lines = content.split('\n');
  const relPath = filePath;

  const makeId = (name: string) => `${relPath}:${name}`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // imports
    const fromImport = /^from\s+(\S+)\s+import\s+(.+)/.exec(line);
    if (fromImport) {
      const symbols = fromImport[2].split(',').map((s) => s.trim()).filter(Boolean);
      imports.push({ from: relPath, to: fromImport[1], symbols });
    }
    const plainImport = /^import\s+(\S+)/.exec(line);
    if (plainImport) {
      imports.push({ from: relPath, to: plainImport[1], symbols: [] });
    }

    // def foo( or async def foo(
    const funcDef = /^(\s*)(async\s+)?def\s+(\w+)\s*\(/.exec(line);
    if (funcDef) {
      const isMethod = funcDef[1].length > 0;
      nodes.push({
        id: makeId(funcDef[3]),
        name: funcDef[3],
        file: relPath,
        line: lineNum,
        type: isMethod ? 'method' : 'function',
        isExported: !funcDef[3].startsWith('_'),
      });
    }

    // class
    const classDef = /^class\s+(\w+)/.exec(line);
    if (classDef) {
      nodes.push({
        id: makeId(classDef[1]),
        name: classDef[1],
        file: relPath,
        line: lineNum,
        type: 'class',
        isExported: !classDef[1].startsWith('_'),
      });
    }

    // calls
    const callRegex = /(\w+)\s*\(/g;
    const keywords = new Set(['if', 'for', 'while', 'with', 'class', 'def', 'return', 'lambda', 'import', 'from', 'as', 'raise', 'except', 'elif', 'print', 'not', 'and', 'or', 'in', 'is', 'del', 'pass', 'break', 'continue', 'yield', 'assert', 'async', 'await']);
    let callMatch;
    while ((callMatch = callRegex.exec(line)) !== null) {
      if (!keywords.has(callMatch[1])) {
        rawCalls.push({ callee: callMatch[1], line: lineNum });
      }
    }
  }

  const seen = new Set<string>();
  const uniqueNodes = nodes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return { nodes: uniqueNodes, calls: rawCalls, imports };
}

export function parseFile(filePath: string): ParseResult {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return { nodes: [], calls: [], imports: [] };
  }

  const ext = path.extname(filePath);
  if (ext === '.py') {
    return parsePython(filePath, content);
  }
  // .ts, .tsx, .js, .jsx, .mjs, .cjs
  return parseTypeScript(filePath, content);
}
