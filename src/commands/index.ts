import { Command } from 'commander';
import chalk from 'chalk';
import { buildGraph } from '../algorithms/graph-builder.js';
import { saveGraph } from '../utils/graph-store.js';
import * as path from 'path';

export function indexCommand(): Command {
  const cmd = new Command('index');
  cmd
    .description('Build call/dependency graph for the project')
    .option('-r, --root <dir>', 'Project root directory', process.cwd())
    .action(async (opts: { root: string }) => {
      const rootDir = path.resolve(opts.root);
      console.log(chalk.cyan(`🔍 Indexing project at ${rootDir} ...`));

      const start = Date.now();
      const graph = buildGraph(rootDir);
      saveGraph(rootDir, graph);
      const elapsed = Date.now() - start;

      const nodeCount = Object.keys(graph.nodes).length;
      const edgeCount = graph.edges.length;

      console.log(chalk.green(`✅ Indexed in ${elapsed}ms`));
      console.log(`   Files:     ${graph.meta.fileCount}`);
      console.log(`   Functions: ${nodeCount}`);
      console.log(`   Calls:     ${edgeCount}`);
      console.log(chalk.dim(`   Graph saved to .impact-graph/graph.json`));
    });
  return cmd;
}
