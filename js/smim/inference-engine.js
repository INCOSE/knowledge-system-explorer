/**
 * SEMANTIC INFERENCE ENGINE (Q-D-I-K-W)
 * -------------------------------------
 * Evaluates SMRM domain rules against the canonical semantic graph.
 * Uses distinct semantic node types (InferredStress, InferredHazard,
 * WisdomDirective, BlindSpot) and edge type ('inference') so renderers
 * visually separate database facts from inferred knowledge.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';

export function applyQdikwInference(graph, qdikwConfig) {
  const qdikw = qdikwConfig?.qdikw || qdikwConfig || {};
  if (!qdikw.active) {
    graph.wisdomAlerts = [];
    graph.blindSpots = [];
    return graph;
  }

  const newNodes = [];
  const newEdges = [];
  const wisdomAlerts = [];
  const blindSpots = [];

  // 1. Decorate Slot nodes with Systems Architect metadata
  const slotMetaMap = qdikw.slotMetadata || {};
  const defaultSlotMeta = slotMetaMap['SLOT_FRONT_SUSPENSION'];

  (graph.nodes || []).forEach(node => {
    const isSlot =
      node.type === 'Slot' ||
      node.properties?.entityClass === 'Slot' ||
      (typeof node.id === 'string' && (node.id.startsWith('Slot_') || node.id.startsWith('st_Slot_')));

    const specificMeta = slotMetaMap[node.id] || (node.properties?.ownerId && slotMetaMap[node.properties.ownerId]);
    if (specificMeta) {
      node.properties = node.properties || {};
      if (specificMeta.loadRegime !== undefined) node.properties.loadRegime = specificMeta.loadRegime;
      if (specificMeta.safetyFunction !== undefined) node.properties.safetyFunction = specificMeta.safetyFunction;
    } else if (isSlot && defaultSlotMeta) {
      node.properties = node.properties || {};
      if (defaultSlotMeta.loadRegime !== undefined) node.properties.loadRegime = defaultSlotMeta.loadRegime;
      if (defaultSlotMeta.safetyFunction !== undefined) node.properties.safetyFunction = defaultSlotMeta.safetyFunction;
    }
  });

  // 2. Discover parts currently mounted in a Slot (not stored in Warehouse)
  const mountedPartToSlot = {};
  (graph.edges || []).forEach(e => {
    if (e.properties?.isCurrent === false) return;
    if (e.label === 'mounted_in' || e.label === 'has_part' || e.type === 'mounted_in' || e.type === 'composition') {
      const fromIsSlot = typeof e.from === 'string' && (e.from.startsWith('Slot_') || e.from.startsWith('st_Slot_'));
      const toIsSlot = typeof e.to === 'string' && (e.to.startsWith('Slot_') || e.to.startsWith('st_Slot_'));

      if (fromIsSlot) {
        const partId = e.childId || (e.to.startsWith('st_') ? (graph.nodes.find(n => n.id === e.to)?.properties?.ownerId || e.to) : e.to);
        mountedPartToSlot[partId] = e.parentId || e.from;
      }
      if (toIsSlot) {
        const partId = e.childId || (e.from.startsWith('st_') ? (graph.nodes.find(n => n.id === e.from)?.properties?.ownerId || e.from) : e.from);
        mountedPartToSlot[partId] = e.parentId || e.to;
      }
      if (e.childId && e.parentId && (e.parentId.startsWith('Slot_') || e.label === 'mounted_in')) {
        mountedPartToSlot[e.childId] = e.parentId;
      }
    }
  });

  // 3. Discover active defects directly from graph.nodes and graph.edges (without scanning eventLog)
  const activeDefects = {};
  const recordDefect = (targetId, name, val) => {
    if (!targetId || !name) return;
    if (!activeDefects[targetId]) activeDefects[targetId] = [];
    if (!activeDefects[targetId].some(d => d.name === name)) {
      activeDefects[targetId].push({ name, val: val !== undefined && val !== null ? val : 'present' });
    }
  };

  // 3a. Active Quality / Defect nodes connected via active inheres_in or has_defect edges
  (graph.edges || []).forEach(e => {
    if (e.properties?.isCurrent === false) return;

    if (e.label === 'inheres_in' || e.type === 'inherence') {
      const fromNode = (graph.nodes || []).find(n => n.id === e.from);
      const toNode = (graph.nodes || []).find(n => n.id === e.to);

      if (fromNode && (fromNode.type === 'Quality' || fromNode.type === 'Defect') && fromNode.properties?.isCurrent !== false) {
        const targetId = toNode?.properties?.ownerId || fromNode.properties?.bearerId || fromNode.properties?.targetId || e.to;
        const name = fromNode.properties?.qualityType || fromNode.properties?.defectType || fromNode.label;
        const val = fromNode.properties?.value;
        recordDefect(targetId, name, val);
      } else if (toNode && (toNode.type === 'Quality' || toNode.type === 'Defect') && toNode.properties?.isCurrent !== false) {
        const targetId = fromNode?.properties?.ownerId || toNode.properties?.bearerId || toNode.properties?.targetId || e.from;
        const name = toNode.properties?.qualityType || toNode.properties?.defectType || toNode.label;
        const val = toNode.properties?.value;
        recordDefect(targetId, name, val);
      }
    } else if (e.label === 'has_defect' || e.type === 'has_defect') {
      const fromNode = (graph.nodes || []).find(n => n.id === e.from);
      const toNode = (graph.nodes || []).find(n => n.id === e.to);

      if (toNode && (toNode.type === 'Defect' || toNode.type === 'Quality') && toNode.properties?.isCurrent !== false) {
        const targetId = fromNode?.properties?.ownerId || toNode.properties?.targetId || toNode.properties?.bearerId || e.from;
        const name = toNode.properties?.defectType || toNode.properties?.qualityType || toNode.label;
        const val = toNode.properties?.value;
        recordDefect(targetId, name, val);
      } else if (fromNode && (fromNode.type === 'Defect' || fromNode.type === 'Quality') && fromNode.properties?.isCurrent !== false) {
        const targetId = toNode?.properties?.ownerId || fromNode.properties?.targetId || fromNode.properties?.bearerId || e.to;
        const name = fromNode.properties?.defectType || fromNode.properties?.qualityType || fromNode.label;
        const val = fromNode.properties?.value;
        recordDefect(targetId, name, val);
      }
    }

    // 3b. NAIVE_EDGE: Custom properties on active mounted_in edges
    if ((e.label === 'mounted_in' || e.type === 'mounted_in') && e.properties) {
      const childId = e.childId || (typeof e.to === 'string' && e.to.startsWith('Slot_') ? e.from : e.to);
      Object.entries(e.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) &&
            !['loadRegime', 'safetyFunction', 'rule', 'action', 'severity', 'status'].includes(k) &&
            v !== undefined && v !== null) {
          recordDefect(childId, k, v);
        }
      });
    }
  });

  // 3c. NAIVE_NODE: Custom properties on active part nodes
  (graph.nodes || []).forEach(node => {
    if (node.properties?.isCurrent === false) return;
    const isSpecial =
      ['Quality', 'Defect', 'Slot', 'State', 'InferredStress', 'InferredHazard', 'WisdomDirective', 'BlindSpot'].includes(node.type) ||
      node.properties?.entityClass === 'Slot' ||
      node.properties?.entityClass === 'State' ||
      (typeof node.id === 'string' && (node.id.startsWith('Slot_') || node.id.startsWith('st_')));

    if (!isSpecial && node.properties) {
      Object.entries(node.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) &&
            !['loadRegime', 'safetyFunction', 'rule', 'action', 'severity', 'status'].includes(k) &&
            v !== undefined && v !== null) {
          recordDefect(node.id, k, v);
        }
      });
    }
  });

  // 4. Evaluate SMRM Rules for mounted parts
  const rules = qdikw.rules || {};
  Object.keys(activeDefects).forEach(partId => {
    const slotId = mountedPartToSlot[partId];
    const slotNode = graph.nodes.find(n => n.id === slotId);
    const loadRegime = slotNode?.properties?.loadRegime || slotMetaMap['SLOT_FRONT_SUSPENSION']?.loadRegime;
    const safetyFunc = slotNode?.properties?.safetyFunction || slotMetaMap['SLOT_FRONT_SUSPENSION']?.safetyFunction;

    const defects = activeDefects[partId] || [];
    defects.forEach(defect => {
      const defName = (defect.name || '').toLowerCase();

      // RULE 1: Context Inheritance (Mounted in Dynamic_Cyclic Slot -> Active_Cyclic_Stress)
      let rule1Passed = false;
      const stressId = `Inf_Stress_${partId}`;
      if (rules.rule1 && loadRegime === 'DYNAMIC_CYCLIC') {
        rule1Passed = true;
        newNodes.push({
          id: stressId,
          label: 'ACTIVE_CYCLIC_STRESS',
          type: 'InferredStress',
          properties: { rule: 'Rule 1: Context Inheritance' }
        });
        if (slotId) {
          newEdges.push({
            id: `edge_r1_${partId}`,
            from: slotId,
            to: stressId,
            label: 'infers_stress',
            type: 'inference',
            properties: { isCurrent: true }
          });
        }
        newEdges.push({
          id: `edge_r1_part_${partId}`,
          from: stressId,
          to: partId,
          label: 'acts_on',
          type: 'inference',
          properties: { isCurrent: true }
        });
      }

      // RULE 2: Material Physics (Active_Cyclic_Stress + Crack > 10mm -> Rapid_Fracture_Propagation)
      let rule2Passed = false;
      const fracId = `Inf_Fracture_${partId}`;
      if (rules.rule2 && rule1Passed && defName === 'crack') {
        const sizeMm = parseFloat(defect.val) || 0;
        if (sizeMm > 10) {
          rule2Passed = true;
          newNodes.push({
            id: fracId,
            label: 'RAPID_FRACTURE_PROPAGATION',
            type: 'InferredHazard',
            properties: { rule: 'Rule 2: Crack > 10mm' }
          });
          newEdges.push({
            id: `edge_r2_${partId}`,
            from: stressId,
            to: fracId,
            label: 'triggers_fracture',
            type: 'inference',
            properties: { isCurrent: true }
          });
        }
      }

      // RULE 3: Functional Safety (Rapid_Fracture + Steering_Control -> LOSS_OF_CONTROL)
      const hazardId = `Inf_Hazard_LOC`;
      if (rules.rule3 && rule2Passed && safetyFunc === 'STEERING_CONTROL') {
        newNodes.push({
          id: hazardId,
          label: 'HAZARD: LOSS_OF_CONTROL',
          type: 'InferredHazard',
          properties: { rule: 'Rule 3: Safety', severity: 'CRITICAL' }
        });
        newEdges.push({
          id: `edge_r3_${partId}`,
          from: fracId,
          to: hazardId,
          label: 'causes_hazard',
          type: 'inference',
          properties: { isCurrent: true }
        });

        wisdomAlerts.push(
          `CRITICAL HAZARD: Loss_of_Control risk on Vehicle_1 via ${partId} (${defect.val} crack under Dynamic_Cyclic load). Ground vehicle & generate work order for suspension arm replacement.`
        );

        // Stage W (Wisdom): Prescriptive Directive Node (Green Trapezoid)
        if (qdikw.stage === 'W') {
          const wisdomNodeId = `Wisdom_Directive_Vehicle_1`;
          newNodes.push({
            id: wisdomNodeId,
            label: 'DIRECTIVE: GROUND VEHICLE_1',
            type: 'WisdomDirective',
            properties: { action: 'Replace Arm SN_404' }
          });
          newEdges.push({
            id: `edge_wisdom_${partId}`,
            from: hazardId,
            to: wisdomNodeId,
            label: 'prescribes_action',
            type: 'inference',
            properties: { isCurrent: true }
          });
        }
      }

      // BLIND SPOT: Unmapped Defect (Yellow Parallelogram)
      if (defName !== 'crack') {
        const blindNodeId = `BlindSpot_${defect.name}`;
        newNodes.push({
          id: blindNodeId,
          label: `UNMAPPED: ${defect.name} (${defect.val})`,
          type: 'BlindSpot',
          properties: { status: 'STOPPED AT INFORMATION LAYER', action: 'Escalate to Specialist' }
        });
        newEdges.push({
          id: `edge_blind_${partId}_${defect.name}`,
          from: partId,
          to: blindNodeId,
          label: 'no_SMRM_rule',
          type: 'inference',
          properties: { isCurrent: true }
        });

        blindSpots.push(
          `Unmapped Engineering Condition (${defect.name} = ${defect.val}): Automated inference stopped at Information layer. Escalate to a human Materials Specialist.`
        );
      }
    });
  });

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