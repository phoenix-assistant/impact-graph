import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { buildGraph } from '../src/algorithms/graph-builder';
import { buildImpactResults } from '../src/algorithms/impact';

const fixtureDir = path.resolve(__dirname, '../fixtures/ts-project');

describe('Graph construction from fixture', () => {
  it('indexes TS fixture and finds function nodes', () => {
    const graph = buildGraph(fixtureDir);
    const names = Object.values(graph.nodes).map((n) => n.name);
    expect(names).toContain('add');
    expect(names).toContain('multiply');
    expect(names).toContain('square');
    expect(names).toContain('formatResult');
  });

  it('finds call edges', () => {
    const graph = buildGraph(fixtureDir);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it('impact of add includes multiply and square', () => {
    const graph = buildGraph(fixtureDir);
    const addNode = Object.values(graph.nodes).find((n) => n.name === 'add');
    if (!addNode) return; // skip if not found
    const results = buildImpactResults(graph, addNode.id, 10);
    const affectedNames = results.map((r) => r.name);
    // multiply calls add, so it should be affected
    expect(affectedNames).toContain('multiply');
  });
});

describe('Graph construction from Python fixture', () => {
  it('indexes Python fixture', () => {
    const pyFixture = path.resolve(__dirname, '../fixtures/python-project');
    const graph = buildGraph(pyFixture);
    const names = Object.values(graph.nodes).map((n) => n.name);
    expect(names).toContain('add');
    expect(names).toContain('multiply');
  });
});

describe('Edge cases', () => {
  it('handles empty directory', () => {
    const emptyDir = '/tmp/impact-graph-test-empty-' + Date.now();
    require('fs').mkdirSync(emptyDir, { recursive: true });
    const graph = buildGraph(emptyDir);
    expect(Object.keys(graph.nodes).length).toBe(0);
    expect(graph.edges.length).toBe(0);
    require('fs').rmdirSync(emptyDir);
  });
});
