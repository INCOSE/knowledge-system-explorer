/**
 * ISO 15926 ONTOLOGY ADAPTER (4D Perdurant)
 * -----------------------------------------
 * Maps the flat Event Log into a 4D Spatio-Temporal Semantic Graph.
 * Entities are treated as 'ActualIndividuals' (4D extents).
 * Relationships do not connect extents directly; instead, they connect 
 * specific 'States' (Temporal Slices) of those entities.
 */

export function generateSemanticGraph(eventLog, baseNodes, currentTime, storageMode) {
  const nodes = [];
  const edges = [];
  
  // Track states per entity to build TRANSITION_TO chains in LPG mode
  const entityStates = {};

  // 1. Create Base 4D Extent Nodes (ActualIndividuals)
  baseNodes.forEach(n => {
    nodes.push({
      id: `4d_${n.id}`,
      label: `${n.label}_4D`,
      type: 'ActualIndividual',
      data: { originalId: n.id, entityType: n.type }
    });
    entityStates[n.id] = [];
  });

  // 2. Process the Event Log to create Temporal Slices (States)
  eventLog.forEach(event => {
    const isActive = (event.valid_to === null || event.valid_to > currentTime) && event.valid_from <= currentTime;
    // For historical view, we might include past events. Here we process all that started <= currentTime
    if (event.valid_from > currentTime) return;

    const parentStateId = `st_${event.from}_${event.id}`;
    const childStateId = `st_${event.to}_${event.id}`;
    
    // Add State nodes for both Parent and Child for this specific event duration
    nodes.push({ id: parentStateId, label: `${event.from}_State`, type: 'State', data: { event, isActive, ownerId: event.from } });
    nodes.push({ id: childStateId, label: `${event.to}_State`, type: 'State', data: { event, isActive, ownerId: event.to } });

    // Link States to their whole 4D Extents
    edges.push({ id: `tpo_p_${event.id}`, from: parentStateId, to: `4d_${event.from}`, label: 'temporalPartOf', type: 'classification', data: { isActive } });
    edges.push({ id: `tpo_c_${event.id}`, from: childStateId, to: `4d_${event.to}`, label: 'temporalPartOf', type: 'classification', data: { isActive } });

    // Link Parent State to Child State
    if (storageMode === 'LPG') {
      edges.push({
        id: event.id,
        from: parentStateId,
        to: childStateId,
        label: 'COMPOSED_OF',
        type: 'composition',
        data: { isActive, event }
      });
      // Store state for later transition chaining
      if (entityStates[event.from]) entityStates[event.from].push({ stateId: parentStateId, event });
    } else { // RDF Mode
      edges.push({
        id: event.id,
        from: parentStateId,
        to: childStateId,
        label: ':hasPart',
        type: 'composition',
        data: { isActive, event }
      });
    }
  });

  // 3. LPG-specific rule: Build TRANSITION_TO chains between sequential states of the same whole
  if (storageMode === 'LPG') {
    Object.keys(entityStates).forEach(entityId => {
      const statesList = entityStates[entityId];
      // Sort states chronologically by their valid_from time
      statesList.sort((a, b) => a.event.valid_from - b.event.valid_from);
      
      for (let i = 0; i < statesList.length - 1; i++) {
        const currState = statesList[i];
        const nextState = statesList[i+1];
        edges.push({
          id: `trans_${entityId}_${i}`,
          from: currState.stateId,
          to: nextState.stateId,
          label: 'TRANSITION_TO',
          type: 'transition',
          data: { atTime: nextState.event.valid_from, isActive: true }
        });
      }
    });
  }

  return { nodes, edges };
}