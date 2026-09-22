/**
 * URMSM LAYER: BOM VIEW (Stakeholder Viewpoint)
 * ---------------------------------------------
 * This module generates the user-facing Bill of Materials (BOM) tree.
 * According to ISO 42010, this is a specific viewpoint for an engineer
 * who only cares about the physical breakdown at time T, abstracting away
 * the underlying database mechanics (LPG/RDF) and temporal ontologies.
 * 
 * Returns pure hierarchical data structures without any DOM or HTML coupling.
 */

/**
 * Recursively builds a pure hierarchical tree structure for the BOM.
 * 
 * @param {string} rootId - The ID of the top-level system.
 * @param {Array<Object>} activeEdges - Array of currently active edges (filtered for Time = T).
 * @returns {Object} Hierarchical node structure: { id: string, children: Array<Object> }.
 */
export function generateBomTree(rootId, activeEdges) {
  return buildTreeRecursive(rootId, activeEdges || [], new Set());
}

/**
 * Helper function to recursively populate tree nodes while guarding against circular references.
 * 
 * @param {string} nodeId - Current node identifier.
 * @param {Array<Object>} activeEdges - Array of active relationship edges.
 * @param {Set<string>} visited - Set of previously visited node identifiers to avoid cycles.
 * @returns {Object} Tree node object.
 */
function buildTreeRecursive(nodeId, activeEdges, visited = new Set()) {
  if (visited.has(nodeId)) {
    return { id: nodeId, children: [] };
  }

  const nextVisited = new Set(visited);
  nextVisited.add(nodeId);

  // Find all child IDs where this node acts as the parent
  const children = activeEdges
    .filter(e => e.from === nodeId)
    .map(e => buildTreeRecursive(e.to, activeEdges, nextVisited));

  return {
    id: nodeId,
    children
  };
}
