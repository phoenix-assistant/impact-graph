import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { loadGraph, findRootDir } from '../utils/graph-store.js';
import { getCircularDeps } from '../algorithms/tarjan.js';
import { computePageRank, computeCallerCount } from '../algorithms/pagerank.js';

function toDot(graph: ReturnType<typeof loadGraph>, highlight?: string): string {
  if (!graph) return '';
  const lines = ['digraph impact {', '  rankdir=LR;', '  node [shape=box fontname="Helvetica"];'];

  for (const [id, node] of Object.entries(graph.nodes)) {
    const label = `${node.name}\\n${path.basename(node.file)}:${node.line}`;
    const color = id === highlight ? 'red' : node.isExported ? 'lightblue' : 'white';
    lines.push(`  "${id}" [label="${label}" style=filled fillcolor="${color}"];`);
  }

  for (const edge of graph.edges) {
    lines.push(`  "${edge.caller}" -> "${edge.callee}";`);
  }

  lines.push('}');
  return lines.join('\n');
}

function toMermaid(graph: ReturnType<typeof loadGraph>, highlight?: string): string {
  if (!graph) return '';
  const lines = ['graph LR'];

  for (const [id, node] of Object.entries(graph.nodes)) {
    const safeId = id.replace(/[^a-zA-Z0-9_]/g, '_');
    const label = `${node.name}`;
    if (id === highlight) {
      lines.push(`  ${safeId}["🔴 ${label}"]`);
    } else {
      lines.push(`  ${safeId}["${label}"]`);
    }
  }

  for (const edge of graph.edges) {
    const callerId = edge.caller.replace(/[^a-zA-Z0-9_]/g, '_');
    const calleeId = edge.callee.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  ${callerId} --> ${calleeId}`);
  }

  return lines.join('\n');
}

export function visualizeCommand(): Command {
  const cmd = new Command('visualize');
  cmd
    .description('Generate dependency graph visualization')
    .option('-r, --root <dir>', 'Project root directory', process.cwd())
    .option('--format <fmt>', 'Output format: dot|mermaid', 'mermaid')
    .option('--highlight <id>', 'Highlight a specific function node ID')
    .action(async (opts: { root: string; format: string; highlight?: string }) => {
      const rootDir = path.resolve(opts.root || findRootDir(process.cwd()));
      const graph = loadGraph(rootDir);

      if (!graph) {
        console.error(chalk.red('❌ No index found. Run `impact-graph index` first.'));
        process.exit(1);
      }

      if (opts.format === 'dot') {
        console.log(toDot(graph, opts.highlight));
      } else {
        console.log(toMermaid(graph, opts.highlight));
      }
    });

  return cmd;
}
