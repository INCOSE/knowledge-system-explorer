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
 * Strictly traverses the ontological hierarchy: Parent -> Slot -> Child.
 * 
 * - When at a Parent (non-Slot): traverses outgoing has_slot or has_part edges to find contextual Slots or sub-components.
 * - When at a Slot: traverses incoming mounted_in edges to locate the mounted Child component.
 * - Under no circumstances does a Slot traverse backwards to its Parent, or a Child backwards to its Slot.
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

  const childIds = new Set();
  const edges = activeEdges || [];

  // Determine if the current node is a contextual Slot
  const isSlotNode = nodeId.startsWith('Slot_') ||
    nodeId.startsWith('st_Slot_') ||
    edges.some(e => e.to === nodeId && (e.label === 'has_slot' || e.type === 'has_slot'));

  if (isSlotNode) {
    // A Slot ONLY contains components mounted into it (Child -[mounted_in]-> Slot)
    edges.forEach(e => {
      const rel = e.label || e.relationType || e.type;
      if (e.to === nodeId && (rel === 'mounted_in' || e.label === 'mounted_in')) {
        if (!nextVisited.has(e.from)) {
          childIds.add(e.from);
        }
      }
    });
  } else {
    // A non-Slot component/system traverses forward:
    // 1. Outgoing slots: Parent -[has_slot]-> Slot
    // 2. Direct sub-components: Parent -[has_part]-> Child
    edges.forEach(e => {
      const rel = e.label || e.relationType || e.type;
      if (e.from === nodeId) {
        if (rel === 'has_slot' || e.label === 'has_slot') {
          if (!nextVisited.has(e.to)) {
            childIds.add(e.to);
          }
        } else if (rel === 'has_part' || e.label === 'has_part') {
          if (!nextVisited.has(e.to)) {
            childIds.add(e.to);
          }
        }
      }
    });
  }

  const children = Array.from(childIds).map(childId => buildTreeRecursive(childId, edges, nextVisited));

  return {
    id: nodeId,
    children
  };
}
