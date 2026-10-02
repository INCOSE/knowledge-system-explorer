/**
 * URMSM LAYER: SMRM GRAPH REDUCTION VIEWPOINT (ISO 42010)
 * -------------------------------------------------------
 * Transforms a canonical SMIM Semantic Graph into the engineer's SMRM perspective.
 * Visually collapses intermediate contextual Slot nodes and renders direct
 * transitive relationships between parent and child components.
 * 
 * Crucially preserves and transfers properties (such as defects like { crack: '2mm' })
 * from the original mounting relationship onto the direct transitive relationship.
 * 
 * Adheres strictly to the Rule of Isolation:
 * Pure graph-to-graph reduction middleware without DOM or Vue coupling.
 * 
 * @param {Object} semanticGraph - Canonical Semantic Graph ({ nodes: Array, edges: Array }).
 * @returns {Object} Reduced Semantic Graph ({ nodes: Array, edges: Array }) for SMRM rendering.
 */

export function reduceGraphForSMRM(semanticGraph) {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes) || !Array.isArray(semanticGraph.edges)) {
    return { nodes: [], edges: [] };
  }

  // 1. Identify all Slot nodes in the semantic graph
  const slotNodeIds = new Set();
  semanticGraph.nodes.forEach(node => {
    const isSlot = node.type === 'Slot' ||
      node.properties?.entityClass === 'Slot' ||
      node.id.startsWith('Slot_') ||
      node.id.startsWith('4d_Slot_') ||
      node.id.startsWith('st_Slot_');
    if (isSlot) {
      slotNodeIds.add(node.id);
    }
  });

  if (slotNodeIds.size === 0) {
    return {
      nodes: semanticGraph.nodes.map(n => ({ ...n, properties: { ...(n.properties || {}) } })),
      edges: semanticGraph.edges.map(e => ({ ...e, properties: { ...(e.properties || {}) } }))
    };
  }

  const nodesToRemove = new Set(slotNodeIds);
  const edgesToRemove = new Set();
  const directTransitiveEdges = [];

  // 2. Locate and collapse [Parent] -[has_slot]-> [Slot] <-[mounted_in]- [Child]
  slotNodeIds.forEach(slotId => {
    // Find has_slot edges from Parent to Slot
    const hasSlotEdges = semanticGraph.edges.filter(
      e => e.to === slotId && (e.label === 'has_slot' || e.type === 'has_slot')
    );

    // Find mounted_in edges from Child to Slot
    const mountedInEdges = semanticGraph.edges.filter(
      e => e.to === slotId && (e.label === 'mounted_in' || e.type === 'mounted_in' || e.type === 'composition')
    );

    hasSlotEdges.forEach(hasSlotEdge => {
      edgesToRemove.add(hasSlotEdge.id);
      const parentNodeId = hasSlotEdge.from;

      mountedInEdges.forEach(mountedInEdge => {
        edgesToRemove.add(mountedInEdge.id);
        const childNodeId = mountedInEdge.from;

        // Formulate direct transitive edge: Parent -> Child
        const directEdgeId = `smrm_${parentNodeId}_${childNodeId}_${mountedInEdge.properties?.validFrom ?? 0}`;

        directTransitiveEdges.push({
          id: directEdgeId,
          from: parentNodeId,
          to: childNodeId,
          label: 'has_part',
          type: 'composition',
          childId: childNodeId,
          parentId: parentNodeId,
          properties: {
            ...(mountedInEdge.properties || {})
          }
        });
      });
    });

    // Also remove temporalPartOf edges linking slot state slices to 4D extents
    semanticGraph.edges.forEach(e => {
      if ((e.from === slotId || e.to === slotId) && e.label === 'temporalPartOf') {
        edgesToRemove.add(e.id);
      }
    });
  });

  const remainingNodes = semanticGraph.nodes
    .filter(n => !nodesToRemove.has(n.id))
    .map(n => ({ ...n, properties: { ...(n.properties || {}) } }));

  const remainingEdges = semanticGraph.edges
    .filter(e => !edgesToRemove.has(e.id))
    .map(e => ({ ...e, properties: { ...(e.properties || {}) } }))
    .concat(directTransitiveEdges);

  return {
    nodes: remainingNodes,
    edges: remainingEdges
  };
}
