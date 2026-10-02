/**
 * BFO ONTOLOGY ADAPTER (3D Continuant)
 * ------------------------------------
 * Maps Domain Business Events into a canonical 3D BFO Semantic Graph.
 * 
 * Ontological Axioms:
 * - Entities (Vehicle, Part, Warehouse) are Independent Continuants ('MaterialEntity')
 *   that endure wholly through time without temporal parts or states.
 * - Defect observations are Specifically Dependent Continuants ('Quality')
 *   that exist only by inhering in an independent continuant via the 'inheres_in' relation.
 * - Relationships between continuants (mounted_in, stored_at, etc.) hold directly
 *   between the continuants at a given time, carrying temporal validity intervals.
 * - Both the Quality node and the 'inheres_in' edge record validFrom: timestamp.
 * - NEVER generates 'State' or 'Temporal Part' nodes.
 * 
 * @param {Array} eventLog - The projection of temporal business events.
 * @param {Array} [baseNodes=[]] - The projection of base continuant entities.
 * @param {number|null} [currentTime=null] - Global time to evaluate current validity.
 * @returns {{ nodes: Array, edges: Array }} The canonical Semantic Graph.
 */

export function generateSemanticGraph(eventLog = [], baseNodes = [], currentTime = null) {
  const nodeMap = new Map();
  const edges = [];

  function ensureContinuantNode(partId, overrideClass = null) {
    if (!nodeMap.has(partId)) {
      nodeMap.set(partId, {
        id: partId,
        label: partId,
        type: 'MaterialEntity',
        properties: {
          originalId: partId,
          entityClass: overrideClass || inferContinuantClass(partId)
        }
      });
    }
  }

  // 1. Initialise base continuant entities (if provided)
  (baseNodes || []).forEach(bn => {
    ensureContinuantNode(bn.id);
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
        ensureContinuantNode(event.partId);
        break;
      }

      case 'ASSEMBLE': {
        const { parentId, childId } = event;
        const relType = event.relationType || 'mounted_in';
        const timestamp = event.valid_from;

        ensureContinuantNode(parentId);
        ensureContinuantNode(childId);

        if (relType === 'stored_at') {
          const edgeId = event.id ? `edge_${event.id}` : `edge_${childId}_${parentId}_${timestamp}`;
          edges.push({
            id: edgeId,
            from: childId,
            to: parentId,
            label: 'stored_at',
            type: 'composition',
            childId,
            parentId,
            properties: {
              validFrom: timestamp,
              validTo: null,
              isCurrent: true
            }
          });
          break;
        }

        // Implicit contextual Slot generation: Slot_${parentId}_${childId}
        const slotId = `Slot_${parentId}_${childId}`;
        ensureContinuantNode(slotId, 'Slot');

        // Link 1: Parent -> Slot (has_slot)
        const slotEdgeId = `edge_slot_${parentId}_${slotId}_${timestamp}`;
        edges.push({
          id: slotEdgeId,
          from: parentId,
          to: slotId,
          label: 'has_slot',
          type: 'has_slot',
          childId: slotId,
          parentId: parentId,
          properties: {
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
          }
        });

        // Link 2: Child -> Slot (mounted_in)
        const mountEdgeId = event.id ? `edge_${event.id}` : `edge_${childId}_${slotId}_${timestamp}`;
        edges.push({
          id: mountEdgeId,
          from: childId,
          to: slotId,
          label: 'mounted_in',
          type: 'composition',
          childId: childId,
          parentId: slotId,
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

        // Locate active assembly relationship for the child component
        const activeEdge = edges.find(
          e => (e.childId === childId || e.from === childId) &&
               (e.label === 'mounted_in' || e.label === 'stored_at') &&
               e.properties.validTo === null
        );
        if (activeEdge) {
          activeEdge.properties.validTo = dismantleTime;
          activeEdge.properties.isCurrent = (currentTime !== null && currentTime !== undefined)
            ? dismantleTime > currentTime
            : false;
        } else {
          console.warn(`[SMIM BFO] No active assembly relationship found to dismantle child part: ${childId}`);
        }
        break;
      }

      case 'REPORT_DEFECT': {
        const { targetId, defectName, defectValue } = event;
        const timestamp = event.valid_from;

        ensureContinuantNode(targetId);

        const qualityId = `qual_${targetId}_${defectName}`;
        const qualityLabel = `${capitalize(defectName)}: ${defectValue}`;

        // Specifically Dependent Continuant (Quality) node recording validFrom
        nodeMap.set(qualityId, {
          id: qualityId,
          label: qualityLabel,
          type: 'Quality',
          properties: {
            originalId: qualityId,
            qualityType: defectName,
            value: defectValue,
            bearerId: targetId,
            entityClass: 'Quality',
            validFrom: timestamp
          }
        });

        // Canonical BFO relation: Quality inheres_in Independent Continuant (with validFrom)
        const edgeId = `inh_${targetId}_${defectName}_${timestamp}`;
        edges.push({
          id: edgeId,
          from: qualityId,
          to: targetId,
          label: 'inheres_in',
          type: 'inherence',
          properties: {
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
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
 * Fallback helper to infer continuant entity class.
 * 
 * @param {string} id - Continuant identifier.
 * @returns {string} Inferred entity class name.
 */
function inferContinuantClass(id) {
  if (/^veh/i.test(id)) return 'Vehicle';
  if (/^slot/i.test(id)) return 'Slot';
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
