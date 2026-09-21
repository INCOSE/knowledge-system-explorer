/**
 * BFO ONTOLOGY ADAPTER (3D Continuant)
 * ------------------------------------
 * Maps the Event Log into a 3D Semantic Graph.
 * Entities are 'MaterialEntities' that endure through time.
 * In LPG, time is a property on the edge.
 * In RDF, relations must be reified into explicit Statement nodes.
 */

export function generateSemanticGraph(eventLog, baseNodes, currentTime, storageMode) {
  const nodes = [];
  const edges = [];

  // 1. Create Base Continuant Nodes
  baseNodes.forEach(n => {
    nodes.push({
      id: n.id,
      label: n.label,
      type: 'MaterialEntity',
      data: { originalId: n.id, entityType: n.type }
    });
  });

  // 2. Process the Event Log
  eventLog.forEach(event => {
    // Check temporal validity
    if (event.valid_from > currentTime) return;
    const isActive = (event.valid_to === null || event.valid_to > currentTime);

    if (storageMode === 'LPG') {
      // In LPG, the temporal data sits neatly as properties on the directed edge
      edges.push({
        id: event.id,
        from: event.from,
        to: event.to,
        label: 'has_part',
        type: 'composition',
        data: { isActive, event }
      });
    } else {
      // RDF Mode: W3C Reification Pattern
      // We cannot put properties on an edge, so we create a Statement Node
      const stmtId = `stmt_${event.id}`;
      const litFromId = `lit_from_${event.id}`;
      const litToId = `lit_to_${event.id}`;

      // The reification node
      nodes.push({
        id: stmtId,
        label: `_:${event.id}`,
        type: 'TemporalPartMembership',
        data: { isActive, event }
      });

      // Links from Statement to Subjects/Objects
      edges.push({ id: `rel_p_${event.id}`, from: stmtId, to: event.from, label: ':hasParent', type: 'reification' });
      edges.push({ id: `rel_c_${event.id}`, from: stmtId, to: event.to, label: ':hasChild', type: 'reification' });

      // Temporal Literals (valid_from)
      nodes.push({ id: litFromId, label: `"T${event.valid_from}"^^xsd:int`, type: 'Literal', data: {} });
      edges.push({ id: `rel_vf_${event.id}`, from: stmtId, to: litFromId, label: ':validFrom', type: 'reification' });

      // Temporal Literals (valid_to) - only if the relation is closed
      if (event.valid_to !== null) {
        nodes.push({ id: litToId, label: `"T${event.valid_to}"^^xsd:int`, type: 'Literal', data: {} });
        edges.push({ id: `rel_vt_${event.id}`, from: stmtId, to: litToId, label: ':validTo', type: 'reification', data: { isPast: true } });
      }
    }
  });

  return { nodes, edges };
}