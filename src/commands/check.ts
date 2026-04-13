import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import { loadGraph, findRootDir } from '../utils/graph-store.js';
import { buildImpactResults } from '../algorithms/impact.js';
import { AffectedNode } from '../types.js';

function renderTable(results: AffectedNode[]): void {
  const table = new Table({
    head: [chalk.bold('Function'), chalk.bold('File'), chalk.bold('Depth'), chalk.bold('Risk Score'), chalk.bold('Callers')],
    colWidths: [35, 45, 8, 12, 9],
  });

  for (const r of results) {
    table.push([
      chalk.yellow(r.name),
      chalk.dim(r.file.slice(-44)),
      String(r.depth),
      chalk.red(String(r.riskScore)),
      String(r.callerCount),
    ]);
  }
  console.log(table.toString());
}

function renderMarkdown(results: AffectedNode[]): void {
  console.log('| Function | File | Depth | Risk Score | Callers |');
  console.log('|----------|------|-------|------------|---------|');
  for (const r of results) {
    console.log(`| ${r.name} | ${r.file} | ${r.depth} | ${r.riskScore} | ${r.callerCount} |`);
  }
}

function parseDiffFunctions(diff: string, graph: Record<string, { file: string; name: string }>): string[] {
  // Find lines like "+++ b/path/to/file.ts" and "@@ ... @@ function_name"
  const changedIds: string[] = [];
  const lines = diff.split('\n');
  let currentFile = '';

  for (const line of lines) {
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }

    // @@ -a,b +c,d @@ optional_context
    const hunkMatch = /^@@ .+ @@ (.*)/.exec(line);
    if (hunkMatch && currentFile) {
      const ctx = hunkMatch[1].trim();
      // ctx might be "function foo(" or "class Foo {" or empty
      const funcMatch = /(?:function|def|async def|class)\s+(\w+)/.exec(ctx);
      if (funcMatch) {
        // Find matching node
        for (const [id, node] of Object.entries(graph)) {
          if (node.name === funcMatch[1] && node.file.endsWith(currentFile)) {
            changedIds.push(id);
          }
        }
      }
    }
  }

  return [...new Set(changedIds)];
}

export function checkCommand(): Command {
  const cmd = new Command('check');
  cmd
    .description('Show what\'s affected by changing a function')
    .argument('[target]', 'Target as file:function')
    .option('-r, --root <dir>', 'Project root directory', process.cwd())
    .option('--depth <n>', 'Max traversal depth', '10')
    .option('--format <fmt>', 'Output format: table|json|markdown', 'table')
    .option('--diff', 'Analyze git diff instead of a specific function')
    .action(async (target: string | undefined, opts: { root: string; depth: string; format: string; diff: boolean }) => {
      const rootDir = path.resolve(opts.root || findRootDir(process.cwd()));
      const graph = loadGraph(rootDir);

      if (!graph) {
        console.error(chalk.red('❌ No index found. Run `impact-graph index` first.'));
        process.exit(1);
      }

      const maxDepth = parseInt(opts.depth, 10);
      let targetIds: string[] = [];

      if (opts.diff) {
        // Get git diff
        try {
          const staged = childProcess.execSync('git diff --cached', { cwd: rootDir, encoding: 'utf-8' });
          const unstaged = childProcess.execSync('git diff', { cwd: rootDir, encoding: 'utf-8' });
          const diff = staged + unstaged;
          targetIds = parseDiffFunctions(diff, graph.nodes);
          if (targetIds.length === 0) {
            console.log(chalk.yellow('⚠️  No changed functions detected in git diff.'));
            return;
          }
          console.log(chalk.cyan(`🔍 Analyzing diff impact for ${targetIds.length} changed function(s)...`));
        } catch (e) {
          console.error(chalk.red('❌ Failed to run git diff. Are you in a git repo?'));
          process.exit(1);
        }
      } else {
        if (!target) {
          console.error(chalk.red('❌ Provide target as <file>:<function> or use --diff'));
          process.exit(1);
        }

        // Find matching node
        const colonIdx = target.lastIndexOf(':');
        if (colonIdx === -1) {
          console.error(chalk.red('❌ Target must be in the format file:function'));
          process.exit(1);
        }
        const targetFile = target.slice(0, colonIdx);
        const targetFunc = target.slice(colonIdx + 1);

        for (const [id, node] of Object.entries(graph.nodes)) {
          if (node.name === targetFunc && (node.file.endsWith(targetFile) || node.file.includes(targetFile))) {
            targetIds.push(id);
          }
        }

        if (targetIds.length === 0) {
          console.error(chalk.red(`❌ Function "${targetFunc}" not found in "${targetFile}". Did you run \`impact-graph index\`?`));
          process.exit(1);
        }
      }

      // Collect all affected
      const allAffected = new Map<string, AffectedNode>();
      for (const id of targetIds) {
        const results = buildImpactResults(graph, id, maxDepth);
        for (const r of results) {
          const existing = allAffected.get(r.id);
          if (!existing || r.riskScore > existing.riskScore) {
            allAffected.set(r.id, r);
          }
        }
      }

      const results = [...allAffected.values()].sort((a, b) => b.riskScore - a.riskScore);

      if (results.length === 0) {
        console.log(chalk.green('✅ No affected functions found.'));
        return;
      }

      console.log(chalk.bold(`\n⚡ Impact Analysis — ${results.length} affected function(s)\n`));

      if (opts.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else if (opts.format === 'markdown') {
        renderMarkdown(results);
      } else {
        renderTable(results);
      }
    });

  return cmd;
}
