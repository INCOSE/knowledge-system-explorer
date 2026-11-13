/**
 * BFO ONTOLOGY ADAPTER (3D Continuant)
 * ------------------------------------
 * Maps Domain Business Events into a canonical 3D BFO Semantic Graph.
 *
 * Ontological Axioms:
 * - Physical entities (Vehicle, Part, Warehouse, Slot) are Independent Continuants ('MaterialEntity').
 * - Defect observations are Specifically Dependent Continuants ('Quality') inhering in their
 *   bearer via 'inheres_in'. Because the Quality inheres in the Part itself (not the mounting slot),
 *   moving the Part to a Warehouse preserves its Quality!
 */

import { inferEntityClass } from '../smrm/definitions.js';

/**
 * Generates the 3D BFO Semantic Graph from the event log up to currentTime.
 *
 * @param {Array} eventLog - Temporal business events.
 * @param {Array} [baseNodes=[]] - Initial base entities.
 * @param {number|null} [currentTime=null] - Global evaluation time T.
 * @param {Object} [options={}] - { showHistory: boolean }.
 * @returns {{ nodes: Array, edges: Array }}
 */
export function generateSemanticGraph(eventLog = [], baseNodes = [], currentTime = null, options = {}) {
  const nodeMap = new Map();
  const edges = [];
  const showHistory = options.showHistory !== undefined ? Boolean(options.showHistory) : true;
  const enableSlot = options.enableSlot !== undefined ? Boolean(options.enableSlot) : true;

  function ensureContinuantNode(partId, overrideClass = null) {
    if (!nodeMap.has(partId)) {
      const entityClass = inferEntityClass(partId, overrideClass);
      nodeMap.set(partId, {
        id: partId,
        label: partId,
        type: 'MaterialEntity',
        properties: {
          originalId: partId,
          entityClass,
          entityType: entityClass === 'Vehicle' ? 'system' : 'element'
        }
      });
    }
    return nodeMap.get(partId);
  }

  // 1. Initialise base continuant entities
  (baseNodes || []).forEach(bn => {
    ensureContinuantNode(bn.id, bn.entityClass || bn.type);
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
        ensureContinuantNode(event.partId, event.entityClass);
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

        // Robert Nilsson Slide 15: If Functional Object / Slot Aspect is disabled,
        // link Child directly to Parent via mounted_in without intermediate Slot node
        if (!enableSlot) {
          const mountEdgeId = event.id ? `edge_${event.id}` : `edge_${childId}_${parentId}_${timestamp}`;
          edges.push({
            id: mountEdgeId,
            from: childId,
            to: parentId,
            label: 'mounted_in',
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

        // Contextual Slot generation: Slot_${parentId}_${childId}
        const slotId = `Slot_${parentId}_${childId}`;
        ensureContinuantNode(slotId, 'Slot');

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
          type: 'composition',
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

        const activeEdge = edges.find(
          e => (e.childId === childId || e.from === childId) &&
               (e.label === 'mounted_in' || e.label === 'stored_at') &&
               e.properties.validTo === null
        );
        if (activeEdge) {
          activeEdge.properties.validTo = dismantleTime;

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
        const timestamp = event.valid_from;

        ensureContinuantNode(targetId);

        const baseQualityId = `qual_${targetId}_${defectName}`;
        let qualityId = baseQualityId;
        const existingNode = nodeMap.get(baseQualityId);
        if (existingNode && existingNode.properties?.validTo !== null) {
          qualityId = `${baseQualityId}_t${timestamp}`;
          let counter = 1;
          while (nodeMap.has(qualityId) && nodeMap.get(qualityId).properties?.validTo !== null) {
            qualityId = `${baseQualityId}_t${timestamp}_${counter++}`;
          }
        }
        const qualityLabel = `${capitalize(defectName)}: ${defectValue}`;

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
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
          }
        });

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

      case 'REVOKE_DEFECT': {
        const { targetId, defectName } = event;
        const revokeTime = event.valid_from;

        // Close the currently active Quality node matching targetId and defectName
        let activeQualityNode = null;
        for (const node of nodeMap.values()) {
          if (
            node.type === 'Quality' &&
            node.properties?.bearerId === targetId &&
            node.properties?.qualityType === defectName &&
            node.properties?.validTo === null
          ) {
            activeQualityNode = node;
            break;
          }
        }

        if (!activeQualityNode) {
          const baseNode = nodeMap.get(`qual_${targetId}_${defectName}`);
          if (baseNode && baseNode.properties?.validTo === null) {
            activeQualityNode = baseNode;
          }
        }

        if (activeQualityNode && activeQualityNode.properties) {
          activeQualityNode.properties.validTo = revokeTime;
        }

        const activeQualityId = activeQualityNode ? activeQualityNode.id : `qual_${targetId}_${defectName}`;

        const activeInherence = edges.find(
          e => (e.from === activeQualityId || e.from.startsWith(`qual_${targetId}_${defectName}`)) &&
               e.to === targetId &&
               e.label === 'inheres_in' &&
               e.properties.validTo === null
        );
        if (activeInherence) {
          activeInherence.properties.validTo = revokeTime;
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

  nodeMap.forEach(node => {
    if (node.type === 'Quality' && node.properties) {
      node.properties.isCurrent = node.properties.validTo === null ||
        (currentTime !== null && currentTime !== undefined ? node.properties.validTo > currentTime : false);
    }
  });

  const filteredEdges = showHistory
    ? edges
    : edges.filter(e => e.properties.isCurrent !== false);

  const filteredNodes = Array.from(nodeMap.values()).filter(n => {
    if (showHistory) return true;
    if (n.type === 'Quality') return n.properties?.isCurrent !== false;
    return true;
  });

  return {
    nodes: filteredNodes,
    edges: filteredEdges
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}