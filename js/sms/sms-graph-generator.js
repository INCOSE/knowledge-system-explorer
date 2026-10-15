/**
 * SMS LAYER: PHYSICAL GRAPH GENERATOR
 * -----------------------------------
 * Transforms a canonical Semantic Graph (SMIM) into physical storage (SMS) per IEC 63339.
 * - RDF Mode: Reifies binary relations carrying temporal/custom properties into W3C
 *   statement nodes and extracts scalar properties into explicit RDF Literal nodes.
 * - LPG Mode: Links sequential 4D states of the same entity via TRANSITION_TO edges.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';

/**
 * Generates a physical graph projection from a canonical semantic graph.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph ({ nodes: Array, edges: Array }).
 * @param {'LPG'|'RDF'} storageMode - Physical storage paradigm ('LPG' or 'RDF').
 * @returns {{ nodes: Array, edges: Array }} Transformed physical graph.
 */
export function generatePhysicalGraph(semanticGraph, storageMode) {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes) || !Array.isArray(semanticGraph.edges)) {
    return { nodes: [], edges: [] };
  }

  const physicalNodes = semanticGraph.nodes.map(node => ({
    ...node,
    properties: node.properties ? { ...node.properties } : {}
  }));

  const physicalEdges = semanticGraph.edges.map(edge => ({
    ...edge,
    properties: edge.properties ? { ...edge.properties } : {}
  }));

  const is4D = physicalNodes.some(n => n.type === 'State' || n.type === 'ActualIndividual');

  // =========================================================================
  // CASE 1: W3C RDF Mode (Triples, Statement Reification & Explicit Literals)
  // =========================================================================
  if (storageMode === 'RDF') {
    if (is4D) {
      // In 4D RDF, States and Defects cannot hold internal property maps;
      // their timestamps and values are persisted as explicit RDF Literal nodes.
      const rdf4dNodes = [];
      const rdf4dEdges = [...physicalEdges];

      physicalNodes.forEach(node => {
        rdf4dNodes.push(node);

        if (node.type === 'State') {
          const vFrom = node.properties?.validFrom;
          const vTo = node.properties?.validTo;
          const isCurrent = node.properties?.isCurrent !== false;

          if (vFrom !== undefined && vFrom !== null) {
            const litFromId = `lit_vf_${node.id}`;
            rdf4dNodes.push({
              id: litFromId,
              label: `"${vFrom}"^^xsd:integer`,
              type: 'Literal',
              properties: { value: vFrom }
            });
            rdf4dEdges.push({
              id: `edge_vf_${node.id}`,
              from: node.id,
              to: litFromId,
              label: 'iso:validFrom',
              type: 'predicate',
              properties: { isCurrent }
            });
          }

          if (vTo !== undefined && vTo !== null) {
            const litToId = `lit_vt_${node.id}`;
            rdf4dNodes.push({
              id: litToId,
              label: `"${vTo}"^^xsd:integer`,
              type: 'Literal',
              properties: { value: vTo }
            });
            rdf4dEdges.push({
              id: `edge_vt_${node.id}`,
              from: node.id,
              to: litToId,
              label: 'iso:validTo',
              type: 'predicate',
              properties: { isCurrent: false }
            });
          }
        } else if (node.type === 'Defect' && node.properties?.value) {
          const litValId = `lit_val_${node.id}`;
          rdf4dNodes.push({
            id: litValId,
            label: `"${node.properties.value}"^^xsd:string`,
            type: 'Literal',
            properties: { value: node.properties.value }
          });
          rdf4dEdges.push({
            id: `edge_val_${node.id}`,
            from: node.id,
            to: litValId,
            label: 'iso:severity',
            type: 'predicate',
            properties: { isCurrent: node.properties?.isCurrent !== false }
          });
        }
      });

      return { nodes: rdf4dNodes, edges: rdf4dEdges };
    }

    // 3D BFO and Naive Graph RDF Reification
    const finalEdges = [];

    // Extract custom properties on nodes (e.g. Naive Node crack="2mm") into RDF Literals
    physicalNodes.slice().forEach(node => {
      if (node.properties) {
        Object.entries(node.properties).forEach(([k, v]) => {
          if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
            const litId = `lit_node_${node.id}_${k}`;
            physicalNodes.push({
              id: litId,
              label: `"${v}"^^xsd:string`,
              type: 'Literal',
              properties: { value: v }
            });
            finalEdges.push({
              id: `rel_lit_${node.id}_${k}`,
              from: node.id,
              to: litId,
              label: `:${k}`,
              type: 'predicate',
              properties: { isCurrent: true }
            });
          }
        });
      }
    });

    physicalEdges.forEach(edge => {
      const hasTemporalProps = edge.properties && (
        edge.properties.validFrom !== undefined ||
        edge.properties.validTo !== undefined
      );
      const isReifiableRelation = [
        'composition',
        'mounted_in',
        'has_slot',
        'stored_at',
        'has_part'
      ].includes(edge.type) || [
        'mounted_in',
        'has_slot',
        'stored_at',
        'has_part'
      ].includes(edge.label);

      if (isReifiableRelation && hasTemporalProps) {
        const stmtId = `stmt_${edge.id}`;
        const isCurrent = edge.properties.isCurrent !== false;
        const rel = edge.label || edge.type;

        // Correct semantic directionality:
        // For mounted_in / stored_at, edge.from is the Child (Part) and edge.to is the Parent (Slot/Warehouse).
        // For has_slot / has_part, edge.from is the Parent and edge.to is the Child.
        const isChildToParent = rel === 'mounted_in' || rel === 'stored_at';
        const parentNodeId = isChildToParent ? edge.to : edge.from;
        const childNodeId = isChildToParent ? edge.from : edge.to;

        physicalNodes.push({
          id: stmtId,
          label: `_:${edge.id}`,
          type: 'RelationalQuality',
          properties: { isCurrent, originalEdgeId: edge.id }
        });

        finalEdges.push({
          id: `rel_p_${edge.id}`,
          from: stmtId,
          to: parentNodeId,
          label: ':hasParent',
          type: 'reification',
          properties: { isCurrent }
        });

        finalEdges.push({
          id: `rel_c_${edge.id}`,
          from: stmtId,
          to: childNodeId,
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

        // Also reify custom edge properties (e.g. crack="2mm" in NAIVE_EDGE mode)
        Object.entries(edge.properties).forEach(([k, v]) => {
          if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
            const litPropId = `lit_prop_${edge.id}_${k}`;
            physicalNodes.push({
              id: litPropId,
              label: `"${v}"^^xsd:string`,
              type: 'Literal',
              properties: { value: v }
            });
            finalEdges.push({
              id: `rel_prop_${edge.id}_${k}`,
              from: stmtId,
              to: litPropId,
              label: `:${k}`,
              type: 'reification',
              properties: { isCurrent }
            });
          }
        });
      } else {
        finalEdges.push(edge);
      }
    });

    return { nodes: physicalNodes, edges: finalEdges };
  }

  // =========================================================================
  // CASE 2: Labeled Property Graph (LPG) Mode
  // =========================================================================
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
              validFrom: nextState.properties?.validFrom,
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