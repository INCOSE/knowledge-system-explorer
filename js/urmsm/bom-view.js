/**
 * URMSM LAYER: BOM VIEW (Stakeholder Viewpoint)
 * ---------------------------------------------
 * This module generates the user-facing Bill of Materials (BOM) tree.
 * According to ISO 42010, this is a specific viewpoint for an engineer
 * who only cares about the physical breakdown at time T, abstracting away
 * the underlying database mechanics (LPG/RDF) and temporal ontologies.
 */

/**
 * Recursively builds an HTML tree for the BOM.
 * 
 * @param {string} rootId - The ID of the top-level system.
 * @param {Array} activeEdges - Array of currently active edges (filtered for Time = T).
 * @returns {string} HTML string representing the tree structure.
 */
export function generateBomHtml(rootId, activeEdges) {
  return `<strong>${rootId}</strong>` + buildTreeRecursive(rootId, activeEdges);
}

function buildTreeRecursive(nodeId, activeEdges) {
  // Find all children where this node is the parent
  const children = activeEdges
    .filter(e => e.from === nodeId)
    .map(e => e.to);

  if (children.length === 0) return '';
  
  let html = '<ul class="tree">';
  children.forEach(childId => {
    html += `<li><strong>${childId}</strong>${buildTreeRecursive(childId, activeEdges)}</li>`;
  });
  html += '</ul>';
  
  return html;
}