/**
 * SMS PHYSICAL GRAPH GENERATOR (LPG & W3C RDF)
 * --------------------------------------------
 * Transforms the Logical (SMIM) semantic graph into its exact physical
 * database representation:
 * - LPG: Property-bearing nodes & edges (with NEXT_STATE / TRANSITION_TO in 4D).
 * - RDF: Strict W3C triples (Subject -> Predicate -> Object/Literal) with
 *        zero edge properties and explicit rdf:Statement reification nodes.
 * 
 * Architecture Note: This module is fully autonomous. It does not import
 * domain definitions. It relies entirely on the topological structure provided
 * by the SMIM layer.
 */

export function generatePhysicalGraph(semanticGraph, storageType = 'LPG') {
  if (!semanticGraph) return { nodes: [], edges: [] };

  // Deep clone so we don't mutate the logical SMIM graph
  const clonedNodes = JSON.parse(JSON.stringify(semanticGraph.nodes || []));
  const clonedEdges = JSON.parse(JSON.stringify(semanticGraph.edges || []));

  if (storageType === 'LPG') {
    return buildPhysicalLpgGraph(clonedNodes, clonedEdges);
  }
  return buildPhysicalRdfGraph(clonedNodes, clonedEdges);
}

function buildPhysicalLpgGraph(nodes, edges) {
  const isIso15926 = nodes.some(n => n.type === 'ActualIndividual' || n.type === 'State');

  if (isIso15926) {
    // In ISO 15926 LPG, temporal bounds live on :State (and :Defect) nodes, NOT on structural edges.
    // We enforce this ontological rule at the physical layer.
    edges.forEach(e => {
      if (e.properties && e.type !== 'transition' && e.label !== 'TRANSITION_TO') {
        delete e.properties.validFrom;
        delete e.properties.validTo;
      }
    });

    // Add explicit physical TRANSITION_TO links between consecutive states of the same 4D individual.
    // We infer ownership entirely via the 'temporalPartOf' relationship structure provided by SMIM.
    const statesByIndividual = {};
    edges.forEach(e => {
      if (e.label === 'temporalPartOf') {
        const stateNode = nodes.find(n => n.id === e.from);
        if (stateNode) {
          if (!statesByIndividual[e.to]) statesByIndividual[e.to] = [];
          statesByIndividual[e.to].push(stateNode);
        }
      }
    });

    Object.values(statesByIndividual).forEach(stateList => {
      // Stable sort: primary by validFrom time, secondary by node ID for determinism
      stateList.sort((a, b) => {
        const timeA = a.properties?.validFrom ?? 0;
        const timeB = b.properties?.validFrom ?? 0;
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });

      for (let i = 0; i < stateList.length - 1; i++) {
        const s1 = stateList[i];
        const s2 = stateList[i + 1];
        const transId = `lpg_trans_${s1.id}_${s2.id}`;
        if (!edges.some(e => e.id === transId)) {
          edges.push({
            id: transId,
            from: s1.id,
            to: s2.id,
            label: 'TRANSITION_TO',
            type: 'transition',
            properties: {
              atTime: s2.properties?.validFrom,
              isCurrent: true
            }
          });
        }
      }
    });
  } else {
    // In BFO LPG, temporal bounds live on the relational edges (mounted_in, inheres_in, etc.),
    // so strip redundant validFrom/validTo from Quality nodes to avoid double printing on the visual canvas.
    nodes.forEach(n => {
      if (n.type === 'Quality' || n.type === 'DependentContinuant') {
        if (n.properties) {
          delete n.properties.validFrom;
          delete n.properties.validTo;
        }
      }
    });
  }

  return { nodes, edges };
}

function buildPhysicalRdfGraph(nodes, edges) {
  const rdfNodes = [];
  const rdfEdges = [];
  const isIso15926 = nodes.some(n => n.type === 'ActualIndividual' || n.type === 'State');

  // Helper to construct W3C standard Literal nodes
  const addLiteral = (parentId, predicateLabel, rawValue, datatype = 'xsd:string', suffix = '') => {
    if (rawValue === undefined || rawValue === null) return;
    const litId = `lit_${parentId}_${predicateLabel.replace(/[^a-zA-Z0-9]/g, '')}_${suffix}`;
    const formattedVal = `"${rawValue}"^^${datatype}`;
    if (!rdfNodes.some(n => n.id === litId)) {
      rdfNodes.push({
        id: litId,
        label: formattedVal,
        type: 'Literal',
        properties: { isCurrent: true }
      });
    }
    rdfEdges.push({
      id: `rdf_e_${litId}`,
      from: parentId,
      to: litId,
      label: predicateLabel,
      type: 'predicate',
      properties: { isCurrent: true }
    });
  };

  // 1. Process Nodes -> strip internal properties into explicit RDF Literals
  nodes.forEach(node => {
    const props = node.properties || {};
    const vf = props.validFrom;
    const vt = props.validTo;

    // Clean node copy without inline properties (in RDF, a URI node is just an identifier)
    const cleanNode = {
      id: node.id,
      label: node.label || node.id,
      type: node.type,
      properties: {
        isCurrent: props.isCurrent !== false,
        entityClass: props.entityClass,
        entityType: props.entityType
      }
    };
    rdfNodes.push(cleanNode);

    // Extract temporal bounds based on Ontology rules
    if (isIso15926 && (node.type === 'State' || node.type === 'Defect')) {
        if (vf !== undefined) addLiteral(node.id, 'iso:validFrom', vf, 'xsd:integer', 'vf');
        if (vt !== undefined && vt !== null) addLiteral(node.id, 'iso:validTo', vt, 'xsd:integer', 'vt');
    } else if (!isIso15926 && (node.type === 'Quality' || node.type === 'Defect')) {
        if (vf !== undefined) addLiteral(node.id, ':validFrom', vf, 'xsd:integer', 'vf');
        if (vt !== undefined && vt !== null) addLiteral(node.id, ':validTo', vt, 'xsd:integer', 'vt');
    }

    // Extract any other custom domain properties (e.g. crack size, severity) into Literals.
    // We ignore system keys to maintain autonomy from definitions.js
    const systemKeys = ['validFrom', 'validTo', 'isCurrent', 'entityClass', 'entityType'];
    Object.entries(props).forEach(([k, v]) => {
      if (!systemKeys.includes(k)) {
         const prefix = isIso15926 ? 'iso:' : ':';
         addLiteral(node.id, `${prefix}${k}`, v, 'xsd:string', k);
      }
    });
  });

  // 2. Process Edges -> in RDF, edges CANNOT hold properties!
  edges.forEach((edge, idx) => {
    const eProps = edge.properties || {};
    const vf = eProps.validFrom;
    const vt = eProps.validTo;
    
    // In BFO, structural relations with time bounds require W3C Reification (rdf:Statement)
    const requiresReification = !isIso15926 && 
                                (edge.label === 'mounted_in' || edge.label === 'stored_at' || edge.label === 'has_slot');

    if (requiresReification) {
      const stmtId = `stmt_${edge.id || idx}_${edge.from}_${edge.to}`;
      rdfNodes.push({
        id: stmtId,
        label: `_:${edge.label}_${edge.from}_${vf ?? 0}`,
        type: 'Statement', // Renders as yellow hexagon
        properties: { isCurrent: eProps.isCurrent !== false }
      });

      // W3C Standard Reification Quads
      rdfEdges.push(
        {
          id: `rdf_subj_${stmtId}`,
          from: stmtId,
          to: edge.from,
          label: 'rdf:subject',
          type: 'predicate',
          properties: { isCurrent: eProps.isCurrent !== false }
        },
        {
          id: `rdf_obj_${stmtId}`,
          from: stmtId,
          to: edge.to,
          label: 'rdf:object',
          type: 'predicate',
          properties: { isCurrent: eProps.isCurrent !== false }
        }
      );

      // Attach temporal bounds to the reified statement node
      if (vf !== undefined) addLiteral(stmtId, ':validFrom', vf, 'xsd:integer', 'vf');
      if (vt !== undefined && vt !== null) addLiteral(stmtId, ':validTo', vt, 'xsd:integer', 'vt');
    } else {
      // Direct binary triple (e.g. temporalPartOf, inheres_in, has_defect) — strictly NO edge properties!
      rdfEdges.push({
        id: edge.id || `rdf_direct_${idx}`,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        type: edge.type,
        properties: { isCurrent: eProps.isCurrent !== false }
      });
    }
  });

  return { nodes: rdfNodes, edges: rdfEdges };
}