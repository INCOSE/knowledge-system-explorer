/**
 * ISO 15926 ONTOLOGY ADAPTER (4D Perdurant)
 * -----------------------------------------
 * Maps Domain Business Events into a canonical 4D ISO 15926 Semantic Graph.
 * 
 * Ontological Axioms:
 * - Physical entities (Vehicle, Part, Warehouse) are 4D individuals ('ActualIndividual')
 *   with spatio-temporal extents across their entire lifetime.
 * - Relationships (mounted_in, stored_at, etc.) do not connect 4D extents directly;
 *   they connect temporal slices ('State') of those entities during specific validity periods.
 * - Each 'State' is linked to its whole 4D extent via the 'temporalPartOf' relation.
 * - A 'Defect' is an independent condition/classification entity that classifies a specific
 *   temporal part ('State') of an entity during a specific time slice, NOT the root 4D individual.
 * 
 * @param {Array} eventLog - The projection of temporal business events.
 * @param {Array} [baseNodes=[]] - The projection of base entities.
 * @param {number|null} [currentTime=null] - Global time to evaluate current validity.
 * @returns {{ nodes: Array, edges: Array }} The canonical Semantic Graph.
 */

export function generateSemanticGraph(eventLog = [], baseNodes = [], currentTime = null) {
  const nodeMap = new Map();
  const edges = [];
  const stateNodesByOwner = new Map();

  function registerStateNode(ownerId, stateNode) {
    if (!stateNodesByOwner.has(ownerId)) {
      stateNodesByOwner.set(ownerId, []);
    }
    stateNodesByOwner.get(ownerId).push(stateNode);
  }

  function ensureExtentNode(partId, overrideClass = null) {
    const extentId = `4d_${partId}`;
    if (!nodeMap.has(extentId)) {
      nodeMap.set(extentId, {
        id: extentId,
        label: `${partId}_4D`,
        type: 'ActualIndividual',
        properties: {
          originalId: partId,
          entityClass: overrideClass || inferEntityType(partId)
        }
      });
    }
    return extentId;
  }

  // 1. Initialise base 4D extent nodes (if provided)
  (baseNodes || []).forEach(bn => {
    ensureExtentNode(bn.id);
  });

  // 2. Filter and sort business events by timestamp
  const eventsToProcess = (eventLog || [])
    .filter(event => currentTime === null || currentTime === undefined || event.valid_from <= currentTime)
    .slice()
    .sort((a, b) => (a.valid_from || 0) - (b.valid_from || 0));


  // 3. Process business events in temporal order
  eventsToProcess.forEach(event => {
    switch (event.type) {
      case 'REGISTER_PART': {
        ensureExtentNode(event.partId);
        break;
      }

      case 'ASSEMBLE': {
        const { parentId, childId } = event;
        const relType = event.relationType || 'mounted_in';
        const timestamp = event.valid_from;

        const parentExtentId = ensureExtentNode(parentId);
        const childExtentId = ensureExtentNode(childId);

        if (relType === 'stored_at') {
          const parentStateId = `st_${parentId}_${event.id || `${childId}_${timestamp}`}`;
          const childStateId = `st_${childId}_${event.id || `${parentId}_${timestamp}`}`;

          const parentState = {
            id: parentStateId,
            label: `${parentId}_State`,
            type: 'State',
            properties: { ownerId: parentId, validFrom: timestamp, validTo: null, isCurrent: true }
          };
          nodeMap.set(parentStateId, parentState);
          registerStateNode(parentId, parentState);

          const childState = {
            id: childStateId,
            label: `${childId}_State`,
            type: 'State',
            properties: { ownerId: childId, validFrom: timestamp, validTo: null, isCurrent: true }
          };
          nodeMap.set(childStateId, childState);
          registerStateNode(childId, childState);

          edges.push({
            id: `tpo_${parentStateId}`,
            from: parentStateId,
            to: parentExtentId,
            label: 'temporalPartOf',
            type: 'classification',
            properties: { validFrom: timestamp, validTo: null, isCurrent: true }
          });

          edges.push({
            id: `tpo_${childStateId}`,
            from: childStateId,
            to: childExtentId,
            label: 'temporalPartOf',
            type: 'classification',
            properties: { validFrom: timestamp, validTo: null, isCurrent: true }
          });

          const storageEdgeId = event.id ? `rel_${event.id}` : `rel_${childId}_${parentId}_${timestamp}`;
          edges.push({
            id: storageEdgeId,
            from: childStateId,
            to: parentStateId,
            label: 'stored_at',
            type: 'composition',
            childId,
            parentId,
            properties: { validFrom: timestamp, validTo: null, isCurrent: true }
          });
          break;
        }

        // Implicit contextual Slot generation: Slot_${parentId}_${childId}
        const slotId = `Slot_${parentId}_${childId}`;
        const slotExtentId = ensureExtentNode(slotId, 'Slot');

        const parentStateId = `st_${parentId}_${event.id || `${slotId}_${timestamp}`}`;
        const slotStateId = `st_${slotId}_${event.id || `${childId}_${timestamp}`}`;
        const childStateId = `st_${childId}_${event.id || `${slotId}_${timestamp}`}`;

        const parentState = {
          id: parentStateId,
          label: `${parentId}_State`,
          type: 'State',
          properties: {
            ownerId: parentId,
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
          }
        };
        nodeMap.set(parentStateId, parentState);
        registerStateNode(parentId, parentState);

        const slotState = {
          id: slotStateId,
          label: `${slotId}_State`,
          type: 'State',
          properties: {
            ownerId: slotId,
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
          }
        };
        nodeMap.set(slotStateId, slotState);
        registerStateNode(slotId, slotState);

        const childState = {
          id: childStateId,
          label: `${childId}_State`,
          type: 'State',
          properties: {
            ownerId: childId,
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
          }
        };
        nodeMap.set(childStateId, childState);
        registerStateNode(childId, childState);

        // Link temporal states to their 4D extents
        edges.push({
          id: `tpo_${parentStateId}`,
          from: parentStateId,
          to: parentExtentId,
          label: 'temporalPartOf',
          type: 'classification',
          properties: { validFrom: timestamp, validTo: null, isCurrent: true }
        });

        edges.push({
          id: `tpo_${slotStateId}`,
          from: slotStateId,
          to: slotExtentId,
          label: 'temporalPartOf',
          type: 'classification',
          properties: { validFrom: timestamp, validTo: null, isCurrent: true }
        });

        edges.push({
          id: `tpo_${childStateId}`,
          from: childStateId,
          to: childExtentId,
          label: 'temporalPartOf',
          type: 'classification',
          properties: { validFrom: timestamp, validTo: null, isCurrent: true }
        });

        // Link 1: Parent State -> Slot State (has_slot)
        const slotEdgeId = `rel_slot_${parentId}_${slotId}_${timestamp}`;
        edges.push({
          id: slotEdgeId,
          from: parentStateId,
          to: slotStateId,
          label: 'has_slot',
          type: 'has_slot',
          childId: slotId,
          parentId: parentId,
          childStateId: slotStateId,
          parentStateId: parentStateId,
          properties: {
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
          }
        });

        // Link 2: Child State -> Slot State (mounted_in)
        const assemblyEdgeId = event.id ? `rel_${event.id}` : `rel_${childId}_${slotId}_${timestamp}`;
        edges.push({
          id: assemblyEdgeId,
          from: childStateId,
          to: slotStateId,
          label: 'mounted_in',
          type: 'composition',
          childId,
          parentId: slotId,
          childStateId,
          parentStateId: slotStateId,
          properties: {
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
          }
        });
        break;
      }

      case 'DISMANTLE': {
        const { childId } = event;
        const dismantleTime = event.valid_from;

        // Find active assembly or storage edge for this child
        const activeAssembly = edges.find(
          e => (e.childId === childId || e.from.startsWith(`st_${childId}_`)) &&
               (e.label === 'mounted_in' || e.label === 'stored_at') &&
               e.properties.validTo === null
        );
        if (activeAssembly) {
          activeAssembly.properties.validTo = dismantleTime;
          activeAssembly.properties.isCurrent = (currentTime !== null && currentTime !== undefined)
            ? dismantleTime > currentTime
            : false;

          // Close the child state slice
          const childState = nodeMap.get(activeAssembly.childStateId);
          if (childState) {
            childState.properties.validTo = dismantleTime;
            childState.properties.isCurrent = activeAssembly.properties.isCurrent;
          }

          // Close the child's temporalPartOf link
          const tpoChild = edges.find(e => e.id === `tpo_${activeAssembly.childStateId}`);
          if (tpoChild) {
            tpoChild.properties.validTo = dismantleTime;
            tpoChild.properties.isCurrent = activeAssembly.properties.isCurrent;
          }
        } else {
          console.warn(`[SMIM ISO15926] No active assembly found to dismantle child part: ${childId}`);
        }
        break;
      }

      case 'REPORT_DEFECT': {
        const { targetId, defectName, defectValue } = event;
        const timestamp = event.valid_from;

        const targetExtentId = ensureExtentNode(targetId);

        // Find current active State of the target part
        const existingStates = stateNodesByOwner.get(targetId) || [];
        let targetState = existingStates.find(st => st.properties?.isCurrent && st.properties?.validTo === null) ||
          existingStates[existingStates.length - 1];

        if (!targetState) {
          const newStateId = `st_${targetId}_def_${event.id || `${defectName}_${timestamp}`}`;
          targetState = {
            id: newStateId,
            label: `${targetId}_State`,
            type: 'State',
            properties: {
              ownerId: targetId,
              validFrom: timestamp,
              validTo: null,
              isCurrent: true
            }
          };
          nodeMap.set(newStateId, targetState);
          registerStateNode(targetId, targetState);

          edges.push({
            id: `tpo_${newStateId}`,
            from: newStateId,
            to: targetExtentId,
            label: 'temporalPartOf',
            type: 'classification',
            properties: { validFrom: timestamp, validTo: null, isCurrent: true }
          });
        }

        const defectNodeId = `def_${targetId}_${defectName}`;
        const defectLabel = `Defect: ${capitalize(defectName)} (${defectValue})`;

        nodeMap.set(defectNodeId, {
          id: defectNodeId,
          label: defectLabel,
          type: 'Defect',
          properties: {
            originalId: defectNodeId,
            defectType: defectName,
            value: defectValue,
            targetId,
            entityClass: 'Defect',
            validFrom: timestamp
          }
        });

        const defectEdgeId = `def_class_${targetId}_${defectName}_${timestamp}`;
        edges.push({
          id: defectEdgeId,
          from: targetState.id,
          to: defectNodeId,
          label: 'has_defect',
          type: 'classification',
          properties: {
            validFrom: timestamp,
            validTo: null,
            isCurrent: targetState.properties.isCurrent
          }
        });
        break;
      }

      default:
        break;
    }
  });

  // 4. Synchronise final temporal currentness flags
  edges.forEach(edge => {
    edge.properties.isCurrent = edge.properties.validTo === null || 
      (currentTime !== null && currentTime !== undefined ? edge.properties.validTo > currentTime : false);
  });

  return { 
    nodes: Array.from(nodeMap.values()), 
    edges 
  };
}

/**
 * Fallback helper to infer entity type from common identifier naming conventions.
 * 
 * @param {string} id - Node identifier.
 * @returns {string} Inferred entity class name.
 */
function inferEntityType(id) {
  if (/^veh/i.test(id)) return 'Vehicle';
  if (/^slot/i.test(id)) return 'Slot';
  if (/^def/i.test(id)) return 'Defect';
  if (/^ware|^wh/i.test(id)) return 'Warehouse';
  return 'Part';
}

/**
 * Capitalises the first letter of a string.
 * @param {string} str 
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
