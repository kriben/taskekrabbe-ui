import type { Node, Edge } from '@xyflow/react';

const NODE_HEIGHT = 120;
const LAYER_GAP_X = 300;
const NODE_GAP_Y = 40;
const CONFIG_NODE_HEIGHT = 80;

/**
 * Layered DAG layout (Sugiyama-style).
 * Assigns each node to a layer based on longest path from sources,
 * then spaces nodes vertically within each layer.
 * Config nodes are placed neatly above their target task node.
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

  // Assign layers via longest-path
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

  // Handle any nodes not reached (cycles or disconnected)
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

  // Build a map of task node id -> config node for slot accounting
  const configByTarget: Record<string, Node> = {};
  for (const cn of configNodes) {
    const configData = cn.data as { targetTaskNodeId?: string };
    if (configData.targetTaskNodeId) {
      configByTarget[configData.targetTaskNodeId] = cn;
    }
  }

  // Compute slot height per layer entry: task node + optional config node stacked above
  const slotHeight = (taskId: string) => {
    const hasConfig = taskId in configByTarget;
    return hasConfig
      ? CONFIG_NODE_HEIGHT + 16 + NODE_HEIGHT // config + gap + task
      : NODE_HEIGHT;
  };

  // Assign positions, accounting for config nodes stacked above their target
  const positionMap: Record<string, { x: number; y: number }> = {};

  // Find the tallest layer (in pixels) to center shorter ones
  let maxLayerHeight = 0;
  for (let l = 0; l <= maxLayer; l++) {
    const ids = layers[l] ?? [];
    let layerHeight = 0;
    for (const id of ids) {
      layerHeight += slotHeight(id);
    }
    layerHeight += (ids.length - 1) * NODE_GAP_Y;
    maxLayerHeight = Math.max(maxLayerHeight, layerHeight);
  }

  for (let l = 0; l <= maxLayer; l++) {
    const ids = layers[l] ?? [];

    // Total height of this layer
    let layerHeight = 0;
    for (const id of ids) {
      layerHeight += slotHeight(id);
    }
    layerHeight += (ids.length - 1) * NODE_GAP_Y;

    const startY = (maxLayerHeight - layerHeight) / 2 + 60;
    const x = 60 + l * LAYER_GAP_X;

    let currentY = startY;
    for (const id of ids) {
      const hasConfig = id in configByTarget;

      if (hasConfig) {
        // Place config node above the task node in the same column
        positionMap[configByTarget[id].id] = {
          x: x,
          y: currentY,
        };
        currentY += CONFIG_NODE_HEIGHT + 16; // config height + gap
      }

      positionMap[id] = { x, y: currentY };
      currentY += NODE_HEIGHT + NODE_GAP_Y;
    }
  }

  // Handle config nodes whose target wasn't found (shouldn't happen, but be safe)
  for (const cn of configNodes) {
    if (!positionMap[cn.id]) {
      positionMap[cn.id] = cn.position;
    }
  }

  return nodes.map((n) => ({
    ...n,
    position: positionMap[n.id] ?? n.position,
  }));
}
