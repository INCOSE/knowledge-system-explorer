/**
 * ISO 15926 ONTOLOGY ADAPTER (4D Perdurant)
 * -----------------------------------------
 * Maps the Event Log projection into a 4D Spatio-Temporal Semantic Graph.
 * Entities are treated as 'ActualIndividuals' (4D extents).
 * Relationships do not connect extents directly; instead, they connect 
 * specific 'States' (temporal parts) of those entities via canonical 'hasPart'
 * composition, with states linked to their 4D extents via 'temporalPartOf'.
 * 
 * Completely decoupled from database storage (SMS) and UI concerns.
 * 
 * @param {Array} eventLog - The projection of temporal events.
 * @param {Array} baseNodes - The projection of base entities.
 * @param {number|null} [currentTime=null] - Global time to evaluate current validity.
 * @returns {{ nodes: Array, edges: Array }} The canonical Semantic Graph.
 */

export function generateSemanticGraph(eventLog, baseNodes, currentTime = null) {
  const nodes = [];
  const edges = [];

  // 1. Create Base 4D Extent Nodes (ActualIndividuals)
  baseNodes.forEach(n => {
    nodes.push({
      id: `4d_${n.id}`,
      label: `${n.label}_4D`,
      type: 'ActualIndividual',
      properties: {
        originalId: n.id,
        entityType: n.type
      }
    });
  });

  // 2. Process the Event Log to create Temporal Slices (States)
  eventLog.forEach(event => {
    if (currentTime !== null && currentTime !== undefined && event.valid_from > currentTime) {
      return;
    }

    const isCurrent = event.valid_to === null || 
      (currentTime !== null && currentTime !== undefined ? event.valid_to > currentTime : false);

    const parentStateId = `st_${event.from}_${event.id}`;
    const childStateId = `st_${event.to}_${event.id}`;

    // Add State nodes for both Parent and Child for this specific event duration
    nodes.push({
      id: parentStateId,
      label: `${event.from}_State`,
      type: 'State',
      properties: {
        ownerId: event.from,
        validFrom: event.valid_from,
        validTo: event.valid_to,
        isCurrent
      }
    });

    nodes.push({
      id: childStateId,
      label: `${event.to}_State`,
      type: 'State',
      properties: {
        ownerId: event.to,
        validFrom: event.valid_from,
        validTo: event.valid_to,
        isCurrent
      }
    });

    // Link States to their whole 4D Extents
    edges.push({
      id: `tpo_p_${event.id}`,
      from: parentStateId,
      to: `4d_${event.from}`,
      label: 'temporalPartOf',
      type: 'classification',
      properties: {
        isCurrent
      }
    });

    edges.push({
      id: `tpo_c_${event.id}`,
      from: childStateId,
      to: `4d_${event.to}`,
      label: 'temporalPartOf',
      type: 'classification',
      properties: {
        isCurrent
      }
    });

    // Link Parent State to Child State (Tenseless composition between temporal parts)
    edges.push({
      id: event.id,
      from: parentStateId,
      to: childStateId,
      label: 'hasPart',
      type: 'composition',
      properties: {
        validFrom: event.valid_from,
        validTo: event.valid_to,
        isCurrent
      }
    });
  });

  return { nodes, edges };
}
