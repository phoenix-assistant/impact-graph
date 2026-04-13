import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { loadGraph, findRootDir } from '../utils/graph-store.js';
import { computePageRank, computeCallerCount } from '../algorithms/pagerank.js';
import { getCircularDeps } from '../algorithms/tarjan.js';

export function statsCommand(): Command {
  const cmd = new Command('stats');
  cmd
    .description('Codebase health metrics — PageRank, circular deps, orphans')
    .option('-r, --root <dir>', 'Project root directory', process.cwd())
    .option('--top <n>', 'Number of top risky functions to show', '10')
    .action(async (opts: { root: string; top: string }) => {
      const rootDir = path.resolve(opts.root || findRootDir(process.cwd()));
      const graph = loadGraph(rootDir);

      if (!graph) {
        console.error(chalk.red('❌ No index found. Run `impact-graph index` first.'));
        process.exit(1);
      }

      const topN = parseInt(opts.top, 10);
      const nodeCount = Object.keys(graph.nodes).length;
      const edgeCount = graph.edges.length;

      console.log(chalk.bold('\n📊 Codebase Health Stats\n'));
      console.log(`  Functions: ${nodeCount}`);
      console.log(`  Calls:     ${edgeCount}`);
      console.log(`  Files:     ${graph.meta.fileCount}`);
      console.log(`  Indexed:   ${new Date(graph.meta.indexedAt).toLocaleString()}`);

      if (nodeCount === 0) {
        console.log(chalk.yellow('\n⚠️  Empty project — nothing to analyze.'));
        return;
      }

      // PageRank
      const ranks = computePageRank(graph);
      const callerCounts = computeCallerCount(graph);

      const sortedNodes = Object.entries(ranks)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN);

      console.log(chalk.bold(`\n🔥 Top ${topN} Riskiest Functions (PageRank)\n`));
      for (const [id, score] of sortedNodes) {
        const node = graph.nodes[id];
        if (!node) continue;
        const callers = callerCounts[id] ?? 0;
        console.log(
          `  ${chalk.yellow(node.name.padEnd(30))} ${chalk.red((score * 100).toFixed(2).padStart(7))} risk  ${String(callers).padStart(4)} callers  ${chalk.dim(path.relative(rootDir, node.file))}`
        );
      }

      // Circular deps
      const circles = getCircularDeps(graph);
      console.log(chalk.bold(`\n🔄 Circular Dependencies: ${circles.length}`));
      if (circles.length > 0) {
        for (const cycle of circles.slice(0, 5)) {
          const names = cycle.map((id) => graph.nodes[id]?.name ?? id).join(' → ');
          console.log(`  ${chalk.red('⚠')} ${names}`);
        }
        if (circles.length > 5) {
          console.log(chalk.dim(`  ... and ${circles.length - 5} more`));
        }
      } else {
        console.log(chalk.green('  ✅ None detected'));
      }

      // Orphan functions
      const calledIds = new Set(graph.edges.map((e) => e.callee));
      const callerIds = new Set(graph.edges.map((e) => e.caller));
      const orphans = Object.keys(graph.nodes).filter((id) => !calledIds.has(id) && !callerIds.has(id));

      console.log(chalk.bold(`\n🌑 Orphan Functions (never called, never call): ${orphans.length}`));
      if (orphans.length > 0) {
        for (const id of orphans.slice(0, 10)) {
          const node = graph.nodes[id];
          if (node) {
            console.log(`  ${chalk.dim(node.name)}  (${path.relative(rootDir, node.file)}:${node.line})`);
          }
        }
        if (orphans.length > 10) console.log(chalk.dim(`  ... and ${orphans.length - 10} more`));
      }

      // Coupling by module
      const coupling: Record<string, number> = {};
      for (const edge of graph.edges) {
        const callerNode = graph.nodes[edge.caller];
        if (callerNode) {
          const file = path.relative(rootDir, callerNode.file);
          coupling[file] = (coupling[file] ?? 0) + 1;
        }
      }

      const topCoupling = Object.entries(coupling)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      if (topCoupling.length > 0) {
        console.log(chalk.bold('\n🔗 Most Coupled Modules (by outgoing calls)\n'));
        for (const [file, count] of topCoupling) {
          console.log(`  ${file.padEnd(50)} ${chalk.yellow(String(count))} calls out`);
        }
      }

      console.log('');
    });

  return cmd;
}
