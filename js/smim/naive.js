/**
 * NAIVE GRAPH ADAPTER (Direct Property Graph)
 * --------------------------------------------
 * Pure function mapping Domain Business Events into an unconstrained Property Graph
 * without 3D Continuant (BFO) or 4D Perdurant (ISO 15926) formalisms.
 *
 * - In 'NAIVE_NODE' mode: Defect reports mutate node properties directly (overwriting history).
 * - In 'NAIVE_EDGE' mode: Defect reports attach to the active assembly edge (vanishing upon dismantle).
 */

import { inferEntityClass } from '../smrm/definitions.js';

/**
 * Generates the Naive Semantic Graph from the event log up to currentTime.
 *
 * @param {Array} eventLog - Temporal business events.
 * @param {Array} [baseNodes=[]] - Initial base entities.
 * @param {number|null} [currentTime=null] - Global evaluation time T.
 * @param {Object} [options={}] - { ontology: 'NAIVE_NODE' | 'NAIVE_EDGE', showHistory: boolean }.
 * @returns {{ nodes: Array, edges: Array }}
 */
export function generateSemanticGraph(eventLog = [], baseNodes = [], currentTime = null, options = {}) {
  const nodeMap = new Map();
  const edges = [];

  const ontologyMode = options.ontology || 'NAIVE_NODE';
  const defectTargetMode = ontologyMode === 'NAIVE_EDGE' ? 'EDGE' : 'NODE';
  const showHistory = options.showHistory !== undefined ? Boolean(options.showHistory) : true;

  function ensureNode(id, explicitClass = null, extraProps = {}) {
    if (!nodeMap.has(id)) {
      const resolvedClass = inferEntityClass(id, explicitClass);
      nodeMap.set(id, {
        id,
        label: id,
        type: resolvedClass,
        properties: {
          entityClass: resolvedClass,
          ...extraProps
        }
      });
    }
    return nodeMap.get(id);
  }

  // 1. Initialise base nodes
  (baseNodes || []).forEach(bn => {
    ensureNode(bn.id, bn.entityClass || bn.type, bn.properties || {});
  });

  // 2. Filter and sort business events by timestamp
  const eventsToProcess = (eventLog || [])
    .filter(event => currentTime === null || currentTime === undefined || event.valid_from <= currentTime)
    .slice()
    .sort((a, b) => (a.valid_from || 0) - (b.valid_from || 0));

  // 3. Process business events in chronological order
  eventsToProcess.forEach(event => {
    switch (event.type) {
      case 'REGISTER_PART': {
        ensureNode(event.partId, event.entityClass);
        break;
      }

      case 'ASSEMBLE': {
        const { parentId, childId } = event;
        const relType = event.relationType || 'mounted_in';
        const timestamp = event.valid_from;

        ensureNode(parentId);
        ensureNode(childId);

        if (relType === 'stored_at') {
          const edgeId = event.id ? `edge_${event.id}` : `edge_${childId}_${parentId}_${timestamp}`;
          edges.push({
            id: edgeId,
            from: childId,
            to: parentId,
            label: 'stored_at',
            type: 'stored_at',
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

        // Contextual Slot generation: Slot_${parentId}_${childId}
        const slotId = `Slot_${parentId}_${childId}`;
        ensureNode(slotId, 'Slot');

        const slotEdgeId = `edge_slot_${event.id || `${parentId}_${slotId}_${timestamp}`}`;
        edges.push({
          id: slotEdgeId,
          from: parentId,
          to: slotId,
          label: 'has_slot',
          type: 'has_slot',
          childId: slotId,
          parentId,
          properties: {
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
          }
        });

        const mountEdgeId = event.id ? `edge_${event.id}` : `edge_${childId}_${slotId}_${timestamp}`;
        edges.push({
          id: mountEdgeId,
          from: childId,
          to: slotId,
          label: 'mounted_in',
          type: 'mounted_in',
          childId,
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

        // Close active mounted_in or stored_at edge for this child
        const activeEdge = edges.find(
          e => (e.childId === childId || e.from === childId) &&
               (e.label === 'mounted_in' || e.label === 'stored_at') &&
               e.properties.validTo === null
        );
        if (activeEdge) {
          activeEdge.properties.validTo = dismantleTime;

          // Also close the contextual has_slot edge if mounted in a Slot
          if (activeEdge.to && activeEdge.to.startsWith('Slot_')) {
            const slotEdge = edges.find(
              e => e.to === activeEdge.to &&
                   e.label === 'has_slot' &&
                   e.properties.validTo === null
            );
            if (slotEdge) {
              slotEdge.properties.validTo = dismantleTime;
            }
          }
        }
        break;
      }

      case 'REPORT_DEFECT': {
        const { targetId, defectName, defectValue } = event;

        if (defectTargetMode === 'NODE') {
          const targetNode = ensureNode(targetId);
          targetNode.properties[defectName] = defectValue;
        } else {
          // EDGE mode: attach defect to currently active assembly/storage edge
          const activeEdge = edges.find(
            e => (e.childId === targetId || e.from === targetId) &&
                 (e.label === 'mounted_in' || e.label === 'stored_at') &&
                 (e.properties.validTo === null || e.properties.validTo >= event.valid_from)
          );
          if (activeEdge) {
            activeEdge.properties[defectName] = defectValue;
          }
        }
        break;
      }

      case 'REVOKE_DEFECT': {
        const { targetId, defectName } = event;
        if (defectTargetMode === 'NODE') {
          const targetNode = nodeMap.get(targetId);
          if (targetNode && targetNode.properties) {
            delete targetNode.properties[defectName];
          }
        } else {
          edges.forEach(e => {
            if ((e.childId === targetId || e.from === targetId) && e.properties && defectName in e.properties) {
              delete e.properties[defectName];
            }
          });
        }
        break;
      }

      default:
        break;
    }
  });

  // 4. Synchronise temporal currentness flags
  edges.forEach(edge => {
    edge.properties.isCurrent = edge.properties.validTo === null ||
      (currentTime !== null && currentTime !== undefined ? edge.properties.validTo > currentTime : false);
  });

  const filteredEdges = showHistory
    ? edges
    : edges.filter(e => e.properties.isCurrent !== false);

  return {
    nodes: Array.from(nodeMap.values()),
    edges: filteredEdges
  };
}