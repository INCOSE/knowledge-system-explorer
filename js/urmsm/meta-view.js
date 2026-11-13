/**
 * URMSM LAYER: 4-LAYER IEC 63339 META-GRAPH GENERATOR
 * ---------------------------------------------------
 * Builds a unified SemanticGraph representing all four IEC 63339 layers simultaneously,
 * operationalising Robert Nilsson's EMEASEC 2026 paper (Figures 2, 5, 6 / Slides 14-17):
 * - Layer 1: URMSM Dimensions & Aspects (Cyan boxes)
 * - Layer 2: SMRM Domain Concepts (Grey boxes)
 * - Layer 3: SMIM Information Elements (White boxes with dark borders)
 * - Layer 4: SMS Data in Tool (Active instance nodes from sandbox)
 */

export function generateMetaGraph(semanticGraph, config = {}) {
  const enableSlot = config.metaConfig?.enableFunctionalSlotAspect ?? config.enableFunctionalSlotAspect ?? true;
  const configRule = config.metaConfig?.configElementRule ?? config.configElementRule ?? 'PART_AND_SLOT';
  const ontology = config.ontology || 'BFO';

  let ontoLabel = 'BFO (3D Continuants)';
  if (ontology === 'ISO15926') ontoLabel = 'ISO 15926 (4D Extents)';
  else if (ontology === 'NAIVE_NODE') ontoLabel = 'Naive Graph (Node Property)';
  else if (ontology === 'NAIVE_EDGE') ontoLabel = 'Naive Graph (Edge Attribute)';

  const nodes = [];
  const edges = [];

  // =========================================================================
  // LAYER 1: URMSM Dimensions & Aspects (Cyan boxes)
  // =========================================================================
  nodes.push(
    { id: 'Dim_PD', label: 'Dimension: Product Development', type: 'MetaURMSM' },
    { id: 'Asp_CM', label: 'Aspect: Concept & Functional Context', type: 'MetaURMSM' },
    { id: 'Dim_Mfg', label: 'Dimension: Manufacturing', type: 'MetaURMSM' },
    { id: 'Asp_BOM', label: 'Aspect: Bill of Materials', type: 'MetaURMSM' },
    { id: 'Dim_Std', label: 'Dimension: Standardised Approach', type: 'MetaURMSM' },
    { id: 'Asp_TLO', label: `Aspect: Top-Level Ontology (${ontoLabel})`, type: 'MetaURMSM' }
  );

  edges.push(
    { id: 'edge_dim_pd_asp_cm', from: 'Dim_PD', to: 'Asp_CM', label: 'composition', type: 'composition' },
    { id: 'edge_dim_mfg_asp_bom', from: 'Dim_Mfg', to: 'Asp_BOM', label: 'composition', type: 'composition' },
    { id: 'edge_dim_std_asp_tlo', from: 'Dim_Std', to: 'Asp_TLO', label: 'composition', type: 'composition' }
  );

  // =========================================================================
  // LAYER 2: SMRM Domain Concepts (Grey boxes)
  // =========================================================================
  nodes.push(
    { id: 'Con_System', label: 'Concept: System (Vehicle)', type: 'MetaSMRM' },
    { id: 'Con_Part', label: 'Concept: System Element / Physical Object (Part)', type: 'MetaSMRM' },
    { id: 'Con_ConfigElem', label: 'Concept: Product Configuration Element', type: 'MetaSMRM' }
  );

  edges.push(
    { id: 'edge_asp_cm_sys', from: 'Asp_CM', to: 'Con_System', label: 'aggregation', type: 'aggregation' },
    { id: 'edge_asp_bom_sys', from: 'Asp_BOM', to: 'Con_System', label: 'aggregation', type: 'aggregation' },
    { id: 'edge_asp_bom_part', from: 'Asp_BOM', to: 'Con_Part', label: 'aggregation', type: 'aggregation' },
    { id: 'edge_asp_cm_part', from: 'Asp_CM', to: 'Con_Part', label: 'aggregation', type: 'aggregation' }
  );

  // Slide 15: Formalising Scope
  if (enableSlot) {
    nodes.push({ id: 'Con_Slot', label: 'Concept: Functional Object / Slot (ISO 81346)', type: 'MetaSMRM' });
    edges.push(
      { id: 'edge_asp_cm_slot', from: 'Asp_CM', to: 'Con_Slot', label: 'aggregation', type: 'aggregation' },
      { id: 'edge_con_sys_slot', from: 'Con_System', to: 'Con_Slot', label: 'composition', type: 'composition' },
      { id: 'edge_con_slot_part', from: 'Con_Slot', to: 'Con_Part', label: 'aggregation', type: 'aggregation' }
    );
  } else {
    edges.push(
      { id: 'edge_asp_cm_direct', from: 'Asp_CM', to: 'Con_System', label: 'direct scope (Slide 15)', type: 'inference' },
      { id: 'edge_con_sys_part', from: 'Con_System', to: 'Con_Part', label: 'composition', type: 'composition' }
    );
  }

  // Slide 16: Configuration Element Specialisation (Red arrows)
  if (configRule === 'PART_ONLY') {
    edges.push({ id: 'edge_rule_part', from: 'Con_Part', to: 'Con_ConfigElem', label: 'specialisation', type: 'meta_rule_red' });
  } else if (configRule === 'SLOT_ONLY') {
    if (enableSlot) {
      edges.push({ id: 'edge_rule_slot', from: 'Con_Slot', to: 'Con_ConfigElem', label: 'specialisation', type: 'meta_rule_red' });
    } else {
      edges.push({ id: 'edge_rule_part_fallback', from: 'Con_Part', to: 'Con_ConfigElem', label: 'specialisation', type: 'meta_rule_red' });
    }
  } else if (configRule === 'SYSTEM_PART_SLOT') {
    edges.push(
      { id: 'edge_rule_sys', from: 'Con_System', to: 'Con_ConfigElem', label: 'specialisation', type: 'meta_rule_red' },
      { id: 'edge_rule_part', from: 'Con_Part', to: 'Con_ConfigElem', label: 'specialisation', type: 'meta_rule_red' }
    );
    if (enableSlot) {
      edges.push({ id: 'edge_rule_slot', from: 'Con_Slot', to: 'Con_ConfigElem', label: 'specialisation', type: 'meta_rule_red' });
    }
  } else {
    edges.push({ id: 'edge_rule_part', from: 'Con_Part', to: 'Con_ConfigElem', label: 'specialisation', type: 'meta_rule_red' });
    if (enableSlot) {
      edges.push({ id: 'edge_rule_slot', from: 'Con_Slot', to: 'Con_ConfigElem', label: 'specialisation', type: 'meta_rule_red' });
    }
  }

  // =========================================================================
  // LAYER 3: SMIM Information Elements (White boxes with dark borders)
  // =========================================================================
  if (ontology === 'BFO') {
    nodes.push(
      { id: 'IE_MaterialEntity', label: ':MaterialEntity (3D Continuant)', type: 'MetaSMIM' },
      { id: 'IE_Site', label: ':BFO_Site (Immaterial Spatial Boundary)', type: 'MetaSMIM' },
      { id: 'IE_Quality', label: ':Quality (Dependent Continuant)', type: 'MetaSMIM' }
    );
    edges.push(
      { id: 'edge_asp_tlo_mat', from: 'Asp_TLO', to: 'IE_MaterialEntity', label: 'defines', type: 'composition' },
      { id: 'edge_asp_tlo_site', from: 'Asp_TLO', to: 'IE_Site', label: 'defines', type: 'composition' },
      { id: 'edge_asp_tlo_qual', from: 'Asp_TLO', to: 'IE_Quality', label: 'defines', type: 'composition' },
      { id: 'edge_ie_mat_sys', from: 'IE_MaterialEntity', to: 'Con_System', label: 'specialisation', type: 'specialization' },
      { id: 'edge_ie_mat_part', from: 'IE_MaterialEntity', to: 'Con_Part', label: 'specialisation', type: 'specialization' },
      { id: 'edge_ie_qual_part', from: 'IE_Quality', to: 'Con_Part', label: 'characterises', type: 'specialization' }
    );
    if (enableSlot) {
      edges.push({ id: 'edge_ie_site_slot', from: 'IE_Site', to: 'Con_Slot', label: 'specialisation', type: 'specialization' });
    }
  } else if (ontology === 'ISO15926') {
    nodes.push(
      { id: 'IE_ActualIndividual', label: ':ActualIndividual (4D Extent)', type: 'MetaSMIM' },
      { id: 'IE_State', label: ':State (Temporal Slice)', type: 'MetaSMIM' },
      { id: 'IE_Defect', label: ':DefectClass (Condition Extent)', type: 'MetaSMIM' }
    );
    edges.push(
      { id: 'edge_asp_tlo_act', from: 'Asp_TLO', to: 'IE_ActualIndividual', label: 'defines', type: 'composition' },
      { id: 'edge_asp_tlo_st', from: 'Asp_TLO', to: 'IE_State', label: 'defines', type: 'composition' },
      { id: 'edge_asp_tlo_def', from: 'Asp_TLO', to: 'IE_Defect', label: 'defines', type: 'composition' },
      { id: 'edge_ie_act_sys', from: 'IE_ActualIndividual', to: 'Con_System', label: 'specialisation', type: 'specialization' },
      { id: 'edge_ie_act_part', from: 'IE_ActualIndividual', to: 'Con_Part', label: 'specialisation', type: 'specialization' },
      { id: 'edge_ie_def_part', from: 'IE_Defect', to: 'Con_Part', label: 'characterises', type: 'specialization' }
    );
    if (enableSlot) {
      edges.push({ id: 'edge_ie_st_slot', from: 'IE_State', to: 'Con_Slot', label: 'specialisation', type: 'specialization' });
    }
  } else {
    // NAIVE_NODE / NAIVE_EDGE
    nodes.push(
      { id: 'IE_NaiveNode', label: ':Part / :Vehicle (Property Graph)', type: 'MetaSMIM' },
      { id: 'IE_NaiveProp', label: 'Inline Property / Edge Attribute', type: 'MetaSMIM' }
    );
    edges.push(
      { id: 'edge_asp_tlo_node', from: 'Asp_TLO', to: 'IE_NaiveNode', label: 'defines', type: 'composition' },
      { id: 'edge_asp_tlo_prop', from: 'Asp_TLO', to: 'IE_NaiveProp', label: 'defines', type: 'composition' },
      { id: 'edge_ie_naive_sys', from: 'IE_NaiveNode', to: 'Con_System', label: 'specialisation', type: 'specialization' },
      { id: 'edge_ie_naive_part', from: 'IE_NaiveNode', to: 'Con_Part', label: 'specialisation', type: 'specialization' },
      { id: 'edge_ie_prop_part', from: 'IE_NaiveProp', to: 'Con_Part', label: 'characterises', type: 'specialization' }
    );
  }

  // =========================================================================
  // LAYER 4: SMS Data in Tool (Live sandbox instances)
  // =========================================================================
  const rawNodes = semanticGraph?.nodes || [];
  const selectedInstances = [];
  const instanceIds = new Set();

  const eligible = rawNodes.filter(n => {
    if (['InferredStress', 'InferredHazard', 'WisdomDirective', 'BlindSpot'].includes(n.type)) return false;
    if (!enableSlot && (n.id.startsWith('Slot_') || n.properties?.entityClass === 'Slot')) return false;
    return true;
  });

  const sysNode = eligible.find(n => n.properties?.entityClass === 'Vehicle' || n.type === 'Vehicle' || n.properties?.entityType === 'system');
  if (sysNode) { selectedInstances.push(sysNode); instanceIds.add(sysNode.id); }

  if (enableSlot) {
    const slotNode = eligible.find(n => (n.id.startsWith('Slot_') || n.properties?.entityClass === 'Slot') && !instanceIds.has(n.id));
    if (slotNode) { selectedInstances.push(slotNode); instanceIds.add(slotNode.id); }
  }

  const defNode = eligible.find(n => (n.type === 'Quality' || n.type === 'Defect' || n.id.startsWith('qual_') || n.id.startsWith('def_')) && !instanceIds.has(n.id));
  if (defNode) { selectedInstances.push(defNode); instanceIds.add(defNode.id); }

  for (const n of eligible) {
    if (selectedInstances.length >= 6) break;
    if (!instanceIds.has(n.id)) {
      selectedInstances.push(n);
      instanceIds.add(n.id);
    }
  }

  selectedInstances.forEach(inst => {
    nodes.push({
      ...inst,
      label: inst.label || inst.id
    });

    let targetIeId = null;
    const isSlot = inst.id.startsWith('Slot_') || inst.properties?.entityClass === 'Slot' || inst.type === 'Slot' || inst.type === 'Site';
    const isQuality = inst.type === 'Quality' || inst.type === 'Defect' || inst.id.startsWith('qual_') || inst.id.startsWith('def_');
    const isState = inst.type === 'State' || inst.id.startsWith('st_');

    if (ontology === 'BFO') {
      if (isQuality) targetIeId = 'IE_Quality';
      else if (isSlot) targetIeId = 'IE_Site';
      else targetIeId = 'IE_MaterialEntity';
    } else if (ontology === 'ISO15926') {
      if (isQuality) targetIeId = 'IE_Defect';
      else if (isState || isSlot) targetIeId = 'IE_State';
      else targetIeId = 'IE_ActualIndividual';
    } else {
      if (isQuality) targetIeId = 'IE_NaiveProp';
      else targetIeId = 'IE_NaiveNode';
    }

    if (targetIeId) {
      edges.push({
        id: `inst_${inst.id}_${targetIeId}`,
        from: inst.id,
        to: targetIeId,
        label: 'instantiate',
        type: 'instantiation',
        properties: { isCurrent: true }
      });
    }
  });

  (semanticGraph?.edges || []).forEach(e => {
    if (instanceIds.has(e.from) && instanceIds.has(e.to) && e.properties?.isCurrent !== false) {
      edges.push({
        ...e,
        id: `meta_data_${e.id || `${e.from}_${e.to}`}`
      });
    }
  });
  return { nodes, edges };
}
