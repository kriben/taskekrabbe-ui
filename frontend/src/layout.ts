import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
const LAYER_GAP_X = 300;
const NODE_GAP_Y = 40;
const CONFIG_OFFSET_X = -220;
const CONFIG_OFFSET_Y = -60;

/**
 * Layered DAG layout (Sugiyama-style).
 * Assigns each node to a layer based on longest path from sources,
 * then spaces nodes vertically within each layer.
 */
export function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  // Separate task nodes from config nodes
  const taskNodes = nodes.filter((n) => n.type !== 'configNode');
  const configNodes = nodes.filter((n) => n.type === 'configNode');
  const taskIds = new Set(taskNodes.map((n) => n.id));

  // Only consider data edges between task nodes for layering
  const dataEdges = edges.filter(
    (e) => e.type !== 'configEdge' && taskIds.has(e.source) && taskIds.has(e.target),
  );

  // Build adjacency and in-degree
  const children: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  for (const n of taskNodes) {
    children[n.id] = [];
    inDegree[n.id] = 0;
  }
  for (const e of dataEdges) {
    children[e.source]?.push(e.target);
    inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
  }

  // Assign layers via longest-path (ensures downstream nodes are always in later layers)
  const layer: Record<string, number> = {};
  for (const id of taskIds) layer[id] = 0;

  // Topological order using Kahn's algorithm
  const queue: string[] = [];
  for (const n of taskNodes) {
    if (inDegree[n.id] === 0) queue.push(n.id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const child of children[current] ?? []) {
      layer[child] = Math.max(layer[child], layer[current] + 1);
      inDegree[child]--;
      if (inDegree[child] === 0) queue.push(child);
    }
  }

  // Handle any nodes not reached (cycles or disconnected) - put them at layer 0
  for (const n of taskNodes) {
    if (!order.includes(n.id)) {
      order.push(n.id);
    }
  }

  // Group nodes by layer
  const layers: Record<number, string[]> = {};
  let maxLayer = 0;
  for (const id of order) {
    const l = layer[id];
    if (!layers[l]) layers[l] = [];
    layers[l].push(id);
    maxLayer = Math.max(maxLayer, l);
  }

  // Order nodes within each layer to reduce edge crossings (simple median heuristic)
  for (let l = 1; l <= maxLayer; l++) {
    const nodesInLayer = layers[l] ?? [];
    const parentPositions: Record<string, number> = {};
    const prevLayer = layers[l - 1] ?? [];

    for (const id of nodesInLayer) {
      // Find parents in previous layer
      const parents = dataEdges
        .filter((e) => e.target === id && prevLayer.includes(e.source))
        .map((e) => prevLayer.indexOf(e.source));
      if (parents.length > 0) {
        parents.sort((a, b) => a - b);
        parentPositions[id] = parents[Math.floor(parents.length / 2)];
      } else {
        parentPositions[id] = Infinity;
      }
    }

    nodesInLayer.sort((a, b) => parentPositions[a] - parentPositions[b]);
    layers[l] = nodesInLayer;
  }

  // Assign positions
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const positionMap: Record<string, { x: number; y: number }> = {};

  // Find the tallest layer to center shorter ones
  let maxLayerSize = 0;
  for (let l = 0; l <= maxLayer; l++) {
    maxLayerSize = Math.max(maxLayerSize, (layers[l] ?? []).length);
  }

  for (let l = 0; l <= maxLayer; l++) {
    const ids = layers[l] ?? [];
    const totalHeight = ids.length * NODE_HEIGHT + (ids.length - 1) * NODE_GAP_Y;
    const maxTotalHeight = maxLayerSize * NODE_HEIGHT + (maxLayerSize - 1) * NODE_GAP_Y;
    const startY = (maxTotalHeight - totalHeight) / 2 + 60;

    ids.forEach((id, index) => {
      positionMap[id] = {
        x: 60 + l * LAYER_GAP_X,
        y: startY + index * (NODE_HEIGHT + NODE_GAP_Y),
      };
    });
  }

  // Position config nodes relative to their target task node
  for (const cn of configNodes) {
    const configData = cn.data as { targetTaskNodeId?: string };
    const targetPos = configData.targetTaskNodeId ? positionMap[configData.targetTaskNodeId] : null;
    if (targetPos) {
      positionMap[cn.id] = {
        x: targetPos.x + CONFIG_OFFSET_X,
        y: targetPos.y + CONFIG_OFFSET_Y,
      };
    } else {
      positionMap[cn.id] = cn.position;
    }
  }

  // Return nodes with updated positions
  return nodes.map((n) => ({
    ...n,
    position: positionMap[n.id] ?? n.position,
  }));
}
