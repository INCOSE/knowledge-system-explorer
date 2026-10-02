/**
 * SMS LAYER: PHYSICAL GRAPH GENERATOR
 * -----------------------------------
 * Transforms a canonical Semantic Graph (SMIM) into physical storage (SMS) per IEC 63339.
 * RDF: Reifies 3D composition relations carrying temporal properties into W3C statement nodes.
 * LPG: Links sequential 4D states of the same entity via TRANSITION_TO edges.
 */

/**
 * Generates a physical graph projection from a canonical semantic graph.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph ({ nodes: Array, edges: Array }).
 * @param {string} storageMode - Physical storage paradigm ('LPG' or 'RDF').
 * @returns {{ nodes: Array, edges: Array }} Transformed physical graph.
 */
export function generatePhysicalGraph(semanticGraph, storageMode) {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes) || !Array.isArray(semanticGraph.edges)) {
    return { nodes: [], edges: [] };
  }

  // Deep clone nodes and edges to maintain immutability
  const physicalNodes = semanticGraph.nodes.map(node => ({
    ...node,
    properties: node.properties ? { ...node.properties } : {}
  }));

  const physicalEdges = semanticGraph.edges.map(edge => ({
    ...edge,
    properties: edge.properties ? { ...edge.properties } : {}
  }));

  const is4D = physicalNodes.some(n => n.type === 'State');

  // Case 1: W3C RDF Mode
  if (storageMode === 'RDF') {
    if (!is4D) {
      const finalEdges = [];

      physicalEdges.forEach(edge => {
        const hasTemporalProps = edge.properties && (
          edge.properties.validFrom !== undefined || 
          edge.properties.validTo !== undefined
        );

        if (edge.type === 'composition' && hasTemporalProps) {
          const stmtId = `stmt_${edge.id}`;
          const isCurrent = edge.properties.isCurrent !== false;

          physicalNodes.push({
            id: stmtId,
            label: `_:${edge.id}`,
            type: 'RelationalQuality',
            properties: { isCurrent, originalEdgeId: edge.id }
          });

          finalEdges.push({
            id: `rel_p_${edge.id}`,
            from: stmtId,
            to: edge.from,
            label: ':hasParent',
            type: 'reification',
            properties: { isCurrent }
          });

          finalEdges.push({
            id: `rel_c_${edge.id}`,
            from: stmtId,
            to: edge.to,
            label: ':hasChild',
            type: 'reification',
            properties: { isCurrent }
          });

          if (edge.properties.validFrom !== undefined && edge.properties.validFrom !== null) {
            const litFromId = `lit_vf_${edge.id}`;
            physicalNodes.push({
              id: litFromId,
              label: `"${edge.properties.validFrom}"^^xsd:integer`,
              type: 'Literal',
              properties: { value: edge.properties.validFrom }
            });

            finalEdges.push({
              id: `rel_vf_${edge.id}`,
              from: stmtId,
              to: litFromId,
              label: ':validFrom',
              type: 'reification',
              properties: { isCurrent }
            });
          }

          if (edge.properties.validTo !== undefined && edge.properties.validTo !== null) {
            const litToId = `lit_vt_${edge.id}`;
            physicalNodes.push({
              id: litToId,
              label: `"${edge.properties.validTo}"^^xsd:integer`,
              type: 'Literal',
              properties: { value: edge.properties.validTo }
            });

            finalEdges.push({
              id: `rel_vt_${edge.id}`,
              from: stmtId,
              to: litToId,
              label: ':validTo',
              type: 'reification',
              properties: { isCurrent: false }
            });
          }
        } else {
          finalEdges.push(edge);
        }
      });

      return { nodes: physicalNodes, edges: finalEdges };
    }

    return { nodes: physicalNodes, edges: physicalEdges };
  }

  // Case 2: Labeled Property Graph (LPG) Mode
  if (storageMode === 'LPG' && is4D) {
    const stateNodes = physicalNodes.filter(n => n.type === 'State');
    const entityStates = new Map();

    stateNodes.forEach(stateNode => {
      let ownerId = stateNode.properties?.ownerId;
      if (!ownerId) {
        const tpoEdge = physicalEdges.find(e => e.from === stateNode.id && e.label === 'temporalPartOf');
        if (tpoEdge) ownerId = tpoEdge.to.replace(/^4d_/, '');
      }

      if (ownerId) {
        if (!entityStates.has(ownerId)) entityStates.set(ownerId, []);
        entityStates.get(ownerId).push(stateNode);
      }
    });

    entityStates.forEach((states, ownerId) => {
      states.sort((a, b) => {
        const fromA = a.properties?.validFrom ?? 0;
        const fromB = b.properties?.validFrom ?? 0;
        return fromA !== fromB ? fromA - fromB : a.id.localeCompare(b.id);
      });

      for (let i = 0; i < states.length - 1; i++) {
        const currState = states[i];
        const nextState = states[i + 1];
        const transitionEdgeId = `trans_${ownerId}_${i}`;

        if (!physicalEdges.some(e => e.id === transitionEdgeId)) {
          physicalEdges.push({
            id: transitionEdgeId,
            from: currState.id,
            to: nextState.id,
            label: 'TRANSITION_TO',
            type: 'transition',
            properties: {
              atTime: nextState.properties?.validFrom,
              isCurrent: nextState.properties?.isCurrent ?? true
            }
          });
        }
      }
    });

    return { nodes: physicalNodes, edges: physicalEdges };
  }

  return { nodes: physicalNodes, edges: physicalEdges };
}
