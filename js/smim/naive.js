/**
 * NAIVE GRAPH ADAPTER (Direct Property Graph)
 * --------------------------------------------
 * Maps Domain Business Events into a direct, unconstrained Property Graph without
 * enforcing 3D Continuant (BFO) or 4D Perdurant (ISO 15926) semantic rules.
 * 
 * In this mode:
 * - Entities (Vehicle, Part, Warehouse, etc.) are direct nodes.
 * - Assembly events create direct relationships (e.g. 'mounted_in', 'stored_at')
 *   directed from child component to parent entity.
 * - Dismantling events locate the active assembly relationship and close its temporal validity.
 * - Defect reports are attached directly to Node properties (if naiveDefectTarget === 'NODE')
 *   or to the active assembly Edge properties (if naiveDefectTarget === 'EDGE').
 * 
 * Decoupled from database storage (SMS) and UI concerns, strictly adhering
 * to the SemanticGraph data contract ({ nodes: [], edges: [] }).
 * 
 * @param {Array} eventLog - The projection of temporal business events.
 * @param {Array} [baseNodes=[]] - The projection of base entities.
 * @param {number|null} [currentTime=null] - Global time to evaluate current validity.
 * @param {Object} [options={}] - Optional configuration overrides.
 * @returns {{ nodes: Array, edges: Array }} The canonical Semantic Graph.
 */

import { state } from '../state.js';

export function generateSemanticGraph(eventLog = [], baseNodes = [], currentTime = null, options = {}) {
  const nodeMap = new Map();
  const edges = [];

  const ontologyMode = options.ontology || state?.ontology || 'NAIVE_NODE';
  const defectTargetMode = ontologyMode === 'NAIVE_EDGE' ? 'EDGE' : (options.naiveDefectTarget || state?.naiveDefectTarget || 'NODE');

  // 1. Initialise base nodes from projection (if provided)
  (baseNodes || []).forEach(bn => {
    nodeMap.set(bn.id, {
      id: bn.id,
      label: bn.label || bn.id,
      type: bn.entityClass || bn.type || inferEntityType(bn.id),
      properties: { ...(bn.properties || {}) }
    });
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
        const partId = event.partId;
        if (!nodeMap.has(partId)) {
          nodeMap.set(partId, {
            id: partId,
            label: partId,
            type: inferEntityType(partId),
            properties: {}
          });
        }
        break;
      }

      case 'ASSEMBLE': {
        const { parentId, childId } = event;
        const relType = event.relationType || 'mounted_in';

        // Ensure both parent and child nodes exist in the node map
        if (!nodeMap.has(parentId)) {
          nodeMap.set(parentId, {
            id: parentId,
            label: parentId,
            type: inferEntityType(parentId),
            properties: {}
          });
        }
        if (!nodeMap.has(childId)) {
          nodeMap.set(childId, {
            id: childId,
            label: childId,
            type: inferEntityType(childId),
            properties: {}
          });
        }

        // Warehouse storage links child directly to warehouse
        if (relType === 'stored_at') {
          const edgeId = event.id ? `edge_${event.id}` : `edge_${childId}_${parentId}_${event.valid_from}`;
          edges.push({
            id: edgeId,
            from: childId,
            to: parentId,
            label: 'stored_at',
            type: 'stored_at',
            childId,
            parentId,
            properties: {
              validFrom: event.valid_from,
              validTo: null,
              isCurrent: true
            }
          });
          break;
        }

        // Implicit contextual Slot generation: Slot_${parentId}_${childId}
        const slotId = `Slot_${parentId}_${childId}`;
        if (!nodeMap.has(slotId)) {
          nodeMap.set(slotId, {
            id: slotId,
            label: slotId,
            type: 'Slot',
            properties: { entityClass: 'Slot' }
          });
        }

        // Link 1: Parent -> Slot (has_slot)
        const slotEdgeId = `edge_slot_${parentId}_${slotId}_${event.valid_from}`;
        edges.push({
          id: slotEdgeId,
          from: parentId,
          to: slotId,
          label: 'has_slot',
          type: 'has_slot',
          childId: slotId,
          parentId: parentId,
          properties: {
            validFrom: event.valid_from,
            validTo: null,
            isCurrent: true
          }
        });

        // Link 2: Child -> Slot (mounted_in)
        const mountEdgeId = event.id ? `edge_${event.id}` : `edge_${childId}_${slotId}_${event.valid_from}`;
        edges.push({
          id: mountEdgeId,
          from: childId,
          to: slotId,
          label: 'mounted_in',
          type: 'mounted_in',
          childId,
          parentId: slotId,
          properties: {
            validFrom: event.valid_from,
            validTo: null,
            isCurrent: true
          }
        });
        break;
      }

      case 'DISMANTLE': {
        const { childId } = event;
        const dismantleTime = event.valid_from;

        // Locate active assembly/storage edge for the child component
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
          console.warn(`[SMIM Naive] No active assembly edge found to dismantle child part: ${childId}`);
        }
        break;
      }

      case 'REPORT_DEFECT': {
        const { targetId, defectName, defectValue } = event;

        if (defectTargetMode === 'NODE') {
          let targetNode = nodeMap.get(targetId);
          if (!targetNode) {
            targetNode = {
              id: targetId,
              label: targetId,
              type: inferEntityType(targetId),
              properties: {}
            };
            nodeMap.set(targetId, targetNode);
          }
          targetNode.properties[defectName] = defectValue;
        } else if (defectTargetMode === 'EDGE') {
          // Find the active assembly edge where targetId is the mounted component
          const activeEdge = edges.find(
            e => (e.childId === targetId || e.from === targetId) &&
                 (e.label === 'mounted_in' || e.type === 'mounted_in') &&
                 (e.properties.validTo === null || e.properties.validTo >= event.valid_from)
          );
          if (activeEdge) {
            activeEdge.properties[defectName] = defectValue;
          } else {
            console.warn(`[SMIM Naive] No active edge found for defect report on part: ${targetId}`);
          }
        }
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

