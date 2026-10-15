/**
 * URMSM LAYER: BOM VIEW (Stakeholder Viewpoint)
 * ---------------------------------------------
 * Generates the user-facing Bill of Materials (BOM) hierarchy for the active
 * ontology at time T:
 * - Dynamically discovers all active root containers (Vehicles, Warehouses).
 * - Never renders a phantom 'System_A' when the graph is empty.
 * - Collapses technical Slot nodes via SMRM reduction.
 * - Attaches active defect indicators (e.g. 'crack: 2mm') to components if and only if
 *   the defect survives in the active ontology at time T.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';
import { reduceGraphForSMRM } from './smrm-view.js';

/**
 * Generates an array of root BOM trees from the current canonical Semantic Graph.
 *
 * @param {Object} semanticGraph - Canonical SMIM Semantic Graph ({ nodes, edges }).
 * @returns {Array<{ id: string, entityClass: string, defects: Array<string>, children: Array }>}
 */
export function generateBomTrees(semanticGraph) {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes) || semanticGraph.nodes.length === 0) {
    return [];
  }

  // Reduce to Engineer SMRM graph so Slots, 4D Extents, and Qualities are normalised
  const smrmGraph = reduceGraphForSMRM(semanticGraph);
  const activeEdges = smrmGraph.edges.filter(e => e.properties?.isCurrent !== false);

  // Map active defects per component ID
  const defectsByNode = new Map();
  const addDefect = (nodeId, label) => {
    if (!defectsByNode.has(nodeId)) defectsByNode.set(nodeId, new Set());
    defectsByNode.get(nodeId).add(label);
  };

  // 1a. Check custom properties on nodes (Naive Node mode)
  smrmGraph.nodes.forEach(node => {
    if (node.type === 'Defect') return;
    if (node.properties) {
      Object.entries(node.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
          addDefect(node.id, `${k}: ${v}`);
        }
      });
    }
  });

  // 1b. Check custom properties on active structural edges (Naive Edge mode)
  activeEdges.forEach(edge => {
    const childId = edge.childId || (edge.label === 'stored_at' || edge.label === 'mounted_in' ? edge.from : edge.to);
    if (edge.properties && childId) {
      Object.entries(edge.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
          addDefect(childId, `${k}: ${v}`);
        }
      });
    }
  });

  // 1c. Check explicit Defect nodes linked via active 'has_defect' edges (BFO & ISO 15926)
  activeEdges.forEach(edge => {
    if (edge.label === 'has_defect' || edge.type === 'has_defect') {
      const defectNode = smrmGraph.nodes.find(n => n.id === edge.to);
      if (defectNode) {
        const dType = defectNode.properties?.defectType || defectNode.properties?.qualityType || 'defect';
        const dVal = defectNode.properties?.value || 'present';
        addDefect(edge.from, `${dType}: ${dVal}`);
      }
    }
  });

  // Build parent -> children adjacency for active structural relations
  const childrenMap = new Map();
  const hasParentSet = new Set();

  activeEdges.forEach(edge => {
    if (edge.label === 'has_defect' || edge.type === 'has_defect') return;

    let parentId = null;
    let childId = null;

    if (edge.label === 'has_part' || edge.label === 'has_slot') {
      parentId = edge.from;
      childId = edge.to;
    } else if (edge.label === 'mounted_in' || edge.label === 'stored_at') {
      parentId = edge.to;
      childId = edge.from;
    }

    if (parentId && childId && parentId !== childId) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, new Set());
      childrenMap.get(parentId).add(childId);
      hasParentSet.add(childId);
    }
  });

  // Identify root nodes (Vehicles, Warehouses, or top-level assemblies without a parent)
  const candidateRoots = smrmGraph.nodes.filter(n => {
    if (n.type === 'Defect' || n.type === 'Slot') return false;
    if (hasParentSet.has(n.id)) return false;
    return n.type === 'Vehicle' || n.type === 'Warehouse' || childrenMap.has(n.id);
  });

  function buildNode(nodeId, visited = new Set()) {
    if (visited.has(nodeId)) {
      return { id: nodeId, defects: [], children: [] };
    }
    const nextVisited = new Set(visited);
    nextVisited.add(nodeId);

    const nodeObj = smrmGraph.nodes.find(n => n.id === nodeId);
    const childIds = Array.from(childrenMap.get(nodeId) || []);
    const defects = Array.from(defectsByNode.get(nodeId) || []);

    return {
      id: nodeId,
      entityClass: nodeObj?.type || 'Part',
      defects,
      children: childIds.map(cid => buildNode(cid, nextVisited))
    };
  }

  return candidateRoots.map(root => buildNode(root.id));
}

/**
 * Backwards-compatible single-root helper.
 */
export function generateBomTree(rootId, activeEdges) {
  const trees = generateBomTrees({
    nodes: [{ id: rootId, type: 'Vehicle', properties: {} }],
    edges: activeEdges || []
  });
  return trees[0] || null;
}