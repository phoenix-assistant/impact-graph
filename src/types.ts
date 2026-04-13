export interface FunctionNode {
  id: string; // "file:functionName"
  name: string;
  file: string;
  line: number;
  type: 'function' | 'method' | 'arrow' | 'class';
  isExported: boolean;
}

export interface CallEdge {
  caller: string; // node id
  callee: string; // node id (may be unresolved)
  line: number;
  resolved: boolean;
}

export interface ImportEdge {
  from: string; // file
  to: string; // file
  symbols: string[];
}

export interface CallGraph {
  nodes: Record<string, FunctionNode>;
  edges: CallEdge[];
  imports: ImportEdge[];
  meta: {
    indexedAt: string;
    rootDir: string;
    fileCount: number;
    version: string;
  };
}

export interface ImpactResult {
  source: string;
  affected: AffectedNode[];
  circularDeps: string[][];
}

export interface AffectedNode {
  id: string;
  file: string;
  name: string;
  depth: number;
  riskScore: number;
  callerCount: number;
}

export interface StatsResult {
  topRiskFunctions: Array<{ id: string; score: number; callerCount: number }>;
  circularDeps: string[][];
  orphanFunctions: string[];
  couplingByModule: Record<string, number>;
  totalNodes: number;
  totalEdges: number;
}
