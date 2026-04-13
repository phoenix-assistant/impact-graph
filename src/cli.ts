#!/usr/bin/env node
import { program } from 'commander';
import { indexCommand } from './commands/index.js';
import { checkCommand } from './commands/check.js';
import { visualizeCommand } from './commands/visualize.js';
import { statsCommand } from './commands/stats.js';

program
  .name('impact-graph')
  .description('"If I change this function, what breaks?" — Change impact analysis powered by call graphs + PageRank')
  .version('0.1.0');

program.addCommand(indexCommand());
program.addCommand(checkCommand());
program.addCommand(visualizeCommand());
program.addCommand(statsCommand());

program.parse();
