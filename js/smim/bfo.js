/**
 * BFO ONTOLOGY ADAPTER (3D Continuant)
 * ------------------------------------
 * Maps the Event Log into a 3D Semantic Graph.
 * Entities are 'MaterialEntities' that endure through time.
 * Relations are Continuant compositions ('has_part') carrying temporal properties.
 * 
 * Completely decoupled from database storage (SMS) and UI concerns.
 * 
 * @param {Array} eventLog - The projection of temporal events.
 * @param {Array} baseNodes - The projection of base continuant entities.
 * @param {number|null} [currentTime=null] - Global time to evaluate current validity.
 * @returns {{ nodes: Array, edges: Array }} The canonical Semantic Graph.
 */

export function generateSemanticGraph(eventLog, baseNodes, currentTime = null) {
  const nodes = [];
  const edges = [];

  // 1. Create Base Continuant Nodes
  baseNodes.forEach(n => {
    nodes.push({
      id: n.id,
      label: n.label,
      type: 'MaterialEntity',
      properties: {
        originalId: n.id,
        entityType: n.type
      }
    });
  });

  // 2. Process the Event Log into canonical 3D relationships
  eventLog.forEach(event => {
    // Check temporal validity
    if (currentTime !== null && currentTime !== undefined && event.valid_from > currentTime) {
      return;
    }

    const isCurrent = event.valid_to === null || 
      (currentTime !== null && currentTime !== undefined ? event.valid_to > currentTime : false);

    edges.push({
      id: event.id,
      from: event.from,
      to: event.to,
      label: 'has_part',
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
