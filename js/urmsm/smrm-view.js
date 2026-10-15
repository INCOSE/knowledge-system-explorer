/**
 * URMSM LAYER: SMRM GRAPH REDUCTION VIEWPOINT (ISO 42010)
 * -------------------------------------------------------
 * Transforms any canonical SMIM Semantic Graph (Naive, 3D BFO, or 4D ISO 15926)
 * into the Engineer's SMRM Perspective:
 * - Collapses intermediate contextual Slot nodes into direct 'has_part' relationships.
 * - Abstracts away 4D Spatio-Temporal Extents ('ActualIndividual') and 'State' slices
 *   into clean domain entities ('Vehicle', 'Part', 'Warehouse', 'Defect'), showing
 *   the engineer purely what domain knowledge survives at time T.
 * - Maps 3D BFO 'MaterialEntity' and 'Quality' nodes into engineering domain classes.
 */

import { inferEntityClass } from '../smrm/definitions.js';

/**
 * Reduces a canonical SMIM graph into the Engineer (SMRM) viewpoint.
 *
 * @param {Object} semanticGraph - Canonical Semantic Graph ({ nodes: Array, edges: Array }).
 * @returns {{ nodes: Array, edges: Array }}
 */
export function reduceGraphForSMRM(semanticGraph) {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes) || !Array.isArray(semanticGraph.edges)) {
    return { nodes: [], edges: [] };
  }

  const is4D = semanticGraph.nodes.some(n => n.type === 'ActualIndividual' || n.type === 'State');
  const isBFO = semanticGraph.nodes.some(n => n.type === 'MaterialEntity' || n.type === 'Quality');

  // Case A: 4D ISO 15926 Graph -> Project onto domain entities
  if (is4D) {
    return reduce4DToSMRM(semanticGraph);
  }

  // Case B: 3D BFO Graph -> Normalize MaterialEntity/Quality & collapse Slots
  if (isBFO) {
    const normalizedNodes = semanticGraph.nodes.map(n => {
      if (n.type === 'MaterialEntity') {
        const cls = inferEntityClass(n.id, n.properties?.entityClass);
        return {
          ...n,
          type: cls,
          properties: { ...(n.properties || {}), entityClass: cls }
        };
      }
      if (n.type === 'Quality') {
        return {
          ...n,
          type: 'Defect',
          properties: { ...(n.properties || {}), entityClass: 'Defect' }
        };
      }
      return { ...n, properties: { ...(n.properties || {}) } };
    });

    const normalizedEdges = semanticGraph.edges.map(e => {
      if (e.label === 'inheres_in' || e.type === 'inherence') {
        // Flip Quality -> Part inheres_in into Part -> Defect has_defect for Engineer View
        return {
          ...e,
          from: e.to,
          to: e.from,
          label: 'has_defect',
          type: 'has_defect',
          properties: { ...(e.properties || {}) }
        };
      }
      return { ...e, properties: { ...(e.properties || {}) } };
    });

    return collapseSlots({ nodes: normalizedNodes, edges: normalizedEdges });
  }

  // Case C: Naive Graph -> Collapse Slots directly while transferring edge properties
  return collapseSlots(semanticGraph);
}

/**
 * Projects a 4D ISO 15926 Semantic Graph into a clean domain graph for the Engineer View,
 * collapsing 4D Extents, States, and Slots while preserving surviving defects.
 */
function reduce4DToSMRM(semanticGraph) {
  const domainNodes = new Map();
  const stateToOwner = new Map();

  semanticGraph.nodes.forEach(node => {
    if (node.type === 'ActualIndividual') {
      const origId = node.properties?.originalId || node.id.replace(/^4d_/, '');
      const cls = inferEntityClass(origId, node.properties?.entityClass);
      if (cls !== 'Slot') {
        domainNodes.set(origId, {
          id: origId,
          label: origId,
          type: cls,
          properties: { entityClass: cls }
        });
      }
    } else if (node.type === 'State') {
      const ownerId = node.properties?.ownerId || node.id.replace(/^st_/, '').split('_evt_')[0];
      stateToOwner.set(node.id, ownerId);
    } else if (node.type === 'Defect') {
      domainNodes.set(node.id, {
        ...node,
        type: 'Defect',
        properties: { ...(node.properties || {}), entityClass: 'Defect' }
      });
    }
  });

  const projectedEdges = [];

  semanticGraph.edges.forEach(edge => {
    if (edge.label === 'temporalPartOf') return;

    const fromOwner = stateToOwner.get(edge.from) || edge.from;
    const toOwner = stateToOwner.get(edge.to) || edge.to;

    if (edge.label === 'has_defect') {
      projectedEdges.push({
        id: `smrm_def_${fromOwner}_${edge.to}`,
        from: fromOwner,
        to: edge.to,
        label: 'has_defect',
        type: 'has_defect',
        properties: {
          ...(edge.properties || {}),
          isCurrent: edge.properties?.validTo === null
        }
      });
      return;
    }

    if (edge.label === 'stored_at') {
      projectedEdges.push({
        id: `smrm_store_${fromOwner}_${toOwner}_${edge.properties?.validFrom ?? 0}`,
        from: fromOwner,
        to: toOwner,
        label: 'stored_at',
        type: 'stored_at',
        childId: fromOwner,
        parentId: toOwner,
        properties: { ...(edge.properties || {}) }
      });
      return;
    }

    if (edge.label === 'has_slot' || edge.label === 'mounted_in') {
      // Ensure intermediate slot exists temporarily so collapseSlots can merge the pair cleanly
      if (toOwner.startsWith('Slot_') && !domainNodes.has(toOwner)) {
        domainNodes.set(toOwner, {
          id: toOwner,
          label: toOwner,
          type: 'Slot',
          properties: { entityClass: 'Slot' }
        });
      }
      projectedEdges.push({
        id: edge.id,
        from: fromOwner,
        to: toOwner,
        label: edge.label,
        type: edge.label,
        childId: edge.childId,
        parentId: edge.parentId,
        properties: { ...(edge.properties || {}) }
      });
    }
  });

  return collapseSlots({
    nodes: Array.from(domainNodes.values()),
    edges: projectedEdges
  });
}

/**
 * Collapses [Parent] -[has_slot]-> [Slot] <-[mounted_in]- [Child] into
 * a direct [Parent] -[has_part]-> [Child] edge, preserving mounting properties.
 */
function collapseSlots(graph) {
  const slotNodeIds = new Set();
  graph.nodes.forEach(node => {
    const isSlot = node.type === 'Slot' ||
      node.properties?.entityClass === 'Slot' ||
      node.id.startsWith('Slot_');
    if (isSlot) {
      slotNodeIds.add(node.id);
    }
  });

  if (slotNodeIds.size === 0) {
    return {
      nodes: graph.nodes.map(n => ({ ...n, properties: { ...(n.properties || {}) } })),
      edges: graph.edges.map(e => ({ ...e, properties: { ...(e.properties || {}) } }))
    };
  }

  const edgesToRemove = new Set();
  const directTransitiveEdges = [];

  slotNodeIds.forEach(slotId => {
    const hasSlotEdges = graph.edges.filter(
      e => e.to === slotId && (e.label === 'has_slot' || e.type === 'has_slot')
    );
    const mountedInEdges = graph.edges.filter(
      e => e.to === slotId && (e.label === 'mounted_in' || e.type === 'mounted_in' || e.type === 'composition')
    );

    hasSlotEdges.forEach(hasSlotEdge => {
      edgesToRemove.add(hasSlotEdge.id);
      const parentNodeId = hasSlotEdge.from;

      mountedInEdges.forEach(mountedInEdge => {
        edgesToRemove.add(mountedInEdge.id);
        const childNodeId = mountedInEdge.from;
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
  });

  const remainingNodes = graph.nodes
    .filter(n => !slotNodeIds.has(n.id))
    .map(n => ({ ...n, properties: { ...(n.properties || {}) } }));

  const remainingEdges = graph.edges
    .filter(e => !edgesToRemove.has(e.id))
    .map(e => ({ ...e, properties: { ...(e.properties || {}) } }))
    .concat(directTransitiveEdges);

  return {
    nodes: remainingNodes,
    edges: remainingEdges
  };
}