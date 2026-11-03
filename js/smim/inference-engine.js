/**
 * SEMANTIC INFERENCE ENGINE (Q-D-I-K-W)
 * -------------------------------------
 * Evaluates SMRM domain rules against the canonical semantic graph.
 * Injects inferred nodes/edges directly into the graph so both Mermaid/Vis
 * and the query panels reflect Knowledge (K) and Wisdom / Blind Spots (W).
 */

export function applyQdikwInference(graph, state) {
  if (!state.qdikw || !state.qdikw.active) {
    graph.wisdomAlerts = [];
    graph.blindSpots = [];
    return graph;
  }

  const newNodes = [];
  const newEdges = [];
  const wisdomAlerts = [];
  const blindSpots = [];

  // 1. Decorate Slot nodes with Systems Architect metadata (loadRegime & safetyFunction)
  const slotMetaMap = state.qdikw.slotMetadata || {};
  (graph.nodes || []).forEach(node => {
    const isTargetSlot =
      slotMetaMap[node.id] ||
      (node.id.startsWith('Slot_') && node.id.includes('ARM_SN_404') && slotMetaMap['SLOT_FRONT_SUSPENSION']);

    if (isTargetSlot) {
      const meta = slotMetaMap[node.id] || slotMetaMap['SLOT_FRONT_SUSPENSION'];
      node.properties = node.properties || {};
      node.properties.loadRegime = meta.loadRegime;
      node.properties.safetyFunction = meta.safetyFunction;
    }
  });

  // 2. Discover parts currently mounted in a Slot (not stored in Warehouse)
  const mountedPartToSlot = {};
  (graph.edges || []).forEach(e => {
    if (e.properties?.isCurrent === false) return;
    if (e.label === 'mounted_in' || e.label === 'has_part') {
      if (e.from.startsWith('Slot_')) mountedPartToSlot[e.to] = e.from;
      if (e.to.startsWith('Slot_')) mountedPartToSlot[e.from] = e.to;
    }
  });

  // 3. Collect active defects at state.currentTime
  const activeDefects = {};
  state.eventLog.forEach(ev => {
    if (ev.valid_from !== undefined && ev.valid_from > state.currentTime) return;
    if (ev.type === 'REPORT_DEFECT') {
      if (ev.valid_to !== null && ev.valid_to !== undefined && ev.valid_to <= state.currentTime) return;
      if (!activeDefects[ev.targetId]) activeDefects[ev.targetId] = [];
      activeDefects[ev.targetId].push({ name: ev.defectName, val: ev.defectValue });
    } else if (ev.type === 'REVOKE_DEFECT') {
      if (activeDefects[ev.targetId]) {
        activeDefects[ev.targetId] = activeDefects[ev.targetId].filter(d => d.name !== ev.defectName);
      }
    }
  });

  // 4. Evaluate SMRM Rules for mounted parts
  Object.keys(mountedPartToSlot).forEach(partId => {
    const slotId = mountedPartToSlot[partId];
    const slotNode = graph.nodes.find(n => n.id === slotId);
    const loadRegime = slotNode?.properties?.loadRegime || slotMetaMap['SLOT_FRONT_SUSPENSION']?.loadRegime;
    const safetyFunc = slotNode?.properties?.safetyFunction || slotMetaMap['SLOT_FRONT_SUSPENSION']?.safetyFunction;

    // RULE 1: Context Inheritance (Mounted in Dynamic_Cyclic Slot -> Active_Cyclic_Stress)
    let rule1Passed = false;
    const stressId = `Inf_Stress_${partId}`;
    if (state.qdikw.rules.rule1 && loadRegime === 'DYNAMIC_CYCLIC') {
      rule1Passed = true;
      newNodes.push({
        id: stressId,
        label: 'ACTIVE_CYCLIC_STRESS',
        type: 'Quality',
        properties: { rule: 'Rule 1: Context Inheritance' }
      });
      newEdges.push({
        id: `edge_r1_${partId}`,
        from: slotId,
        to: stressId,
        label: 'infers_stress',
        type: 'inherence',
        properties: { isCurrent: true }
      });
      newEdges.push({
        id: `edge_r1_part_${partId}`,
        from: stressId,
        to: partId,
        label: 'acts_on',
        type: 'inherence',
        properties: { isCurrent: true }
      });
    }

    const defects = activeDefects[partId] || [];
    defects.forEach(defect => {
      const defName = (defect.name || '').toLowerCase();

      // RULE 2: Material Physics (Active_Cyclic_Stress + Crack > 10mm -> Rapid_Fracture_Propagation)
      let rule2Passed = false;
      const fracId = `Inf_Fracture_${partId}`;
      if (state.qdikw.rules.rule2 && rule1Passed && defName === 'crack') {
        const sizeMm = parseFloat(defect.val) || 0;
        if (sizeMm > 10) {
          rule2Passed = true;
          newNodes.push({
            id: fracId,
            label: 'RAPID_FRACTURE_PROPAGATION',
            type: 'Defect',
            properties: { rule: 'Rule 2: Crack > 10mm' }
          });
          newEdges.push({
            id: `edge_r2_${partId}`,
            from: stressId,
            to: fracId,
            label: 'triggers_fracture',
            type: 'has_defect',
            properties: { isCurrent: true }
          });
        }
      }

      // RULE 3: Functional Safety (Rapid_Fracture + Steering_Control -> LOSS_OF_CONTROL)
      const hazardId = `Inf_Hazard_LOC`;
      if (state.qdikw.rules.rule3 && rule2Passed && safetyFunc === 'STEERING_CONTROL') {
        newNodes.push({
          id: hazardId,
          label: 'HAZARD: LOSS_OF_CONTROL',
          type: 'Defect',
          properties: { severity: 'CRITICAL' }
        });
        newEdges.push({
          id: `edge_r3_${partId}`,
          from: fracId,
          to: hazardId,
          label: 'causes_hazard',
          type: 'has_defect',
          properties: { isCurrent: true }
        });

        wisdomAlerts.push(
          `CRITICAL HAZARD: Loss_of_Control risk on Vehicle_1 via ${partId} (15mm crack under Dynamic_Cyclic load). Ground vehicle & generate work order for suspension arm replacement.`
        );

        // On Stage W (Wisdom), also project the prescriptive directive node onto the graph canvas
        if (state.qdikw.stage === 'W') {
          const wisdomNodeId = `Wisdom_Directive_Vehicle_1`;
          newNodes.push({
            id: wisdomNodeId,
            label: 'DIRECTIVE: GROUND VEHICLE_1',
            type: 'Defect',
            properties: { action: 'Replace Arm SN_404' }
          });
          newEdges.push({
            id: `edge_wisdom_${partId}`,
            from: hazardId,
            to: wisdomNodeId,
            label: 'prescribes_action',
            type: 'has_defect',
            properties: { isCurrent: true }
          });
        }
      }

      // BLIND SPOT: Unmapped Defect (e.g. surface_corrosion)
      if (defName !== 'crack') {
        const blindNodeId = `BlindSpot_${defect.name}`;
        newNodes.push({
          id: blindNodeId,
          label: `UNMAPPED: ${defect.name} (${defect.val})`,
          type: 'Quality',
          properties: { status: 'STOPPED AT INFORMATION LAYER', action: 'Escalate to Specialist' }
        });
        newEdges.push({
          id: `edge_blind_${partId}_${defect.name}`,
          from: partId,
          to: blindNodeId,
          label: 'no_SMRM_rule',
          type: 'inherence',
          properties: { isCurrent: true }
        });

        blindSpots.push(
          `Unmapped Engineering Condition (${defect.name} = ${defect.val}): Automated inference stopped at Information layer. Escalate to a human Materials Specialist.`
        );
      }
    });
  });

  // Deduplicate and append inferred nodes & edges
  newNodes.forEach(nn => {
    if (!graph.nodes.some(existing => existing.id === nn.id)) {
      graph.nodes.push(nn);
    }
  });
  newEdges.forEach(ne => {
    if (!graph.edges.some(existing => existing.id === ne.id)) {
      graph.edges.push(ne);
    }
  });

  graph.wisdomAlerts = [...new Set(wisdomAlerts)];
  graph.blindSpots = [...new Set(blindSpots)];

  return graph;
}