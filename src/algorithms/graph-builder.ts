import { CallGraph, FunctionNode, CallEdge, ImportEdge } from '../types.js';
import { collectSourceFiles } from '../utils/graph-store.js';
import { parseFile } from '../parsers/regex-parser.js';

export function buildGraph(rootDir: string): CallGraph {
  const files = collectSourceFiles(rootDir);

  const allNodes: Record<string, FunctionNode> = {};
  const allCallEdges: CallEdge[] = [];
  const allImports: ImportEdge[] = [];

  // First pass: collect all function definitions
  const fileRawCalls: Map<string, Array<{ callee: string; line: number }>> = new Map();
  for (const file of files) {
    const result = parseFile(file);
    for (const node of result.nodes) {
      allNodes[node.id] = node;
    }
    fileRawCalls.set(file, result.calls);
    allImports.push(...result.imports);
  }

  // Build name -> node id index for resolution
  const nameToIds: Map<string, string[]> = new Map();
  for (const [id, node] of Object.entries(allNodes)) {
    const ids = nameToIds.get(node.name) ?? [];
    ids.push(id);
    nameToIds.set(node.name, ids);
  }

  // Second pass: resolve calls
  for (const [file, calls] of fileRawCalls) {
    for (const call of calls) {
      const candidates = nameToIds.get(call.callee);
      if (candidates && candidates.length > 0) {
        // Find caller: functions defined in this file that contain this line
        const callerNode = findCallerAtLine(allNodes, file, call.line);
        const callerId = callerNode?.id ?? `${file}:__top__`;

        for (const calleeId of candidates) {
          if (calleeId !== callerId) {
            allCallEdges.push({
              caller: callerId,
              callee: calleeId,
              line: call.line,
              resolved: true,
            });
          }
        }
      }
    }
  }

  // Deduplicate edges
  const edgeSet = new Set<string>();
  const uniqueEdges: CallEdge[] = [];
  for (const edge of allCallEdges) {
    const key = `${edge.caller}->${edge.callee}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      uniqueEdges.push(edge);
    }
  }

  return {
    nodes: allNodes,
    edges: uniqueEdges,
    imports: allImports,
    meta: {
      indexedAt: new Date().toISOString(),
      rootDir,
      fileCount: files.length,
      version: '0.1.0',
    },
  };
}

function findCallerAtLine(
  nodes: Record<string, FunctionNode>,
  file: string,
  callLine: number
): FunctionNode | null {
  let best: FunctionNode | null = null;
  for (const node of Object.values(nodes)) {
    if (node.file === file && node.line <= callLine) {
      if (!best || node.line > best.line) {
        best = node;
      }
    }
  }
  return best;
}
