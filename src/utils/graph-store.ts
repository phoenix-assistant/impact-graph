import * as fs from 'fs';
import * as path from 'path';
import { CallGraph } from '../types.js';

const GRAPH_DIR = '.impact-graph';
const GRAPH_FILE = 'graph.json';

export function getGraphPath(rootDir: string): string {
  return path.join(rootDir, GRAPH_DIR, GRAPH_FILE);
}

export function saveGraph(rootDir: string, graph: CallGraph): void {
  const dir = path.join(rootDir, GRAPH_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, GRAPH_FILE), JSON.stringify(graph, null, 2));
}

export function loadGraph(rootDir: string): CallGraph | null {
  const graphPath = getGraphPath(rootDir);
  if (!fs.existsSync(graphPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(graphPath, 'utf-8');
    return JSON.parse(raw) as CallGraph;
  } catch {
    return null;
  }
}

export function findRootDir(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'package.json')) ||
      fs.existsSync(path.join(dir, 'pyproject.toml')) ||
      fs.existsSync(path.join(dir, '.git'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

export function collectSourceFiles(rootDir: string): string[] {
  const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py']);
  const ignored = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.impact-graph', 'coverage']);
  const results: string[] = [];

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return results;
}
