/**
 * ISO 15926 ONTOLOGY ADAPTER (4D Perdurant)
 * -----------------------------------------
 * Maps Domain Business Events into a canonical 4D ISO 15926 Semantic Graph.
 *
 * Ontological Axioms:
 * - Physical entities (Vehicle, Part, Warehouse, Slot) are 4D individuals ('ActualIndividual')
 *   with spatio-temporal extents across their entire lifetime.
 * - Relationships connect temporal slices ('State') of those entities during specific validity periods.
 * - Each 'State' is linked to its 4D extent via 'temporalPartOf'.
 * - A 'Defect' classifies the temporal 'State' of the entity.
 */

import { inferEntityClass } from '../smrm/definitions.js';

/**
 * Generates the 4D ISO 15926 Semantic Graph from the event log up to currentTime.
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
  const stateNodesByOwner = new Map();
  const showHistory = options.showHistory !== undefined ? Boolean(options.showHistory) : true;

  function registerStateNode(ownerId, stateNode) {
    if (!stateNodesByOwner.has(ownerId)) {
      stateNodesByOwner.set(ownerId, []);
    }
    stateNodesByOwner.get(ownerId).push(stateNode);
  }

  function ensureExtentNode(partId, overrideClass = null) {
    const extentId = `4d_${partId}`;
    if (!nodeMap.has(extentId)) {
      const entityClass = inferEntityClass(partId, overrideClass);
      nodeMap.set(extentId, {
        id: extentId,
        label: `${partId}_4D`,
        type: 'ActualIndividual',
        properties: {
          originalId: partId,
          entityClass
        }
      });
    }
    return extentId;
  }

  // 1. Initialise base 4D extent nodes
  (baseNodes || []).forEach(bn => {
    ensureExtentNode(bn.id, bn.entityClass || bn.type);
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
        ensureExtentNode(event.partId, event.entityClass);
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
            childStateId,
            parentStateId,
            properties: { validFrom: timestamp, validTo: null, isCurrent: true }
          });
          break;
        }

        // Contextual Slot generation: Slot_${parentId}_${childId}
        const slotId = `Slot_${parentId}_${childId}`;
        const slotExtentId = ensureExtentNode(slotId, 'Slot');

        const parentStateId = `st_${parentId}_${event.id || `${slotId}_${timestamp}`}`;
        const slotStateId = `st_${slotId}_${event.id || `${childId}_${timestamp}`}`;
        const childStateId = `st_${childId}_${event.id || `${slotId}_${timestamp}`}`;

        const parentState = {
          id: parentStateId,
          label: `${parentId}_State`,
          type: 'State',
          properties: { ownerId: parentId, validFrom: timestamp, validTo: null, isCurrent: true }
        };
        nodeMap.set(parentStateId, parentState);
        registerStateNode(parentId, parentState);

        const slotState = {
          id: slotStateId,
          label: `${slotId}_State`,
          type: 'State',
          properties: { ownerId: slotId, validFrom: timestamp, validTo: null, isCurrent: true }
        };
        nodeMap.set(slotStateId, slotState);
        registerStateNode(slotId, slotState);

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
          parentId,
          childStateId: slotStateId,
          parentStateId,
          properties: { validFrom: timestamp, validTo: null, isCurrent: true }
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
          properties: { validFrom: timestamp, validTo: null, isCurrent: true }
        });
        break;
      }

      case 'DISMANTLE': {
        const { childId } = event;
        const dismantleTime = event.valid_from;

        const activeAssembly = edges.find(
          e => (e.childId === childId || e.from.startsWith(`st_${childId}_`)) &&
               (e.label === 'mounted_in' || e.label === 'stored_at') &&
               e.properties.validTo === null
        );
        if (activeAssembly) {
          activeAssembly.properties.validTo = dismantleTime;

          // Close child state slice and its temporalPartOf link
          const childState = nodeMap.get(activeAssembly.childStateId);
          if (childState) {
            childState.properties.validTo = dismantleTime;
          }
          const tpoChild = edges.find(e => e.id === `tpo_${activeAssembly.childStateId}`);
          if (tpoChild) {
            tpoChild.properties.validTo = dismantleTime;
          }

          // Close contextual slot state, its has_slot edge, and the parent state slice
          const slotStateId = activeAssembly.parentStateId;
          if (slotStateId && slotStateId.startsWith('st_Slot_')) {
            const slotState = nodeMap.get(slotStateId);
            if (slotState) {
              slotState.properties.validTo = dismantleTime;
            }
            const tpoSlot = edges.find(e => e.id === `tpo_${slotStateId}`);
            if (tpoSlot) {
              tpoSlot.properties.validTo = dismantleTime;
            }
            const hasSlotEdge = edges.find(
              e => e.to === slotStateId && e.label === 'has_slot' && e.properties.validTo === null
            );
            if (hasSlotEdge) {
              hasSlotEdge.properties.validTo = dismantleTime;
              const parentState = nodeMap.get(hasSlotEdge.parentStateId);
              if (parentState) {
                parentState.properties.validTo = dismantleTime;
              }
              const tpoParent = edges.find(e => e.id === `tpo_${hasSlotEdge.parentStateId}`);
              if (tpoParent) {
                tpoParent.properties.validTo = dismantleTime;
              }
            }
          }
        }
        break;
      }

      case 'REPORT_DEFECT': {
        const { targetId, defectName, defectValue } = event;
        const timestamp = event.valid_from;

        const targetExtentId = ensureExtentNode(targetId);

        const existingStates = stateNodesByOwner.get(targetId) || [];
        let targetState = existingStates.find(st => st.properties?.validTo === null) ||
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
            validFrom: timestamp,
            validTo: null,
            isCurrent: true
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
            isCurrent: true
          }
        });
        break;
      }

      case 'REVOKE_DEFECT': {
        const { targetId, defectName } = event;
        const revokeTime = event.valid_from;
        const defectNodeId = `def_${targetId}_${defectName}`;

        edges.forEach(e => {
          if (e.to === defectNodeId && e.label === 'has_defect' && e.properties.validTo === null) {
            e.properties.validTo = revokeTime;
          }
        });
        const dNode = nodeMap.get(defectNodeId);
        if (dNode && dNode.properties) {
          dNode.properties.validTo = revokeTime;
        }
        break;
      }

      default:
        break;
    }
  });

  // 4. Synchronise final temporal currentness flags across States, Defects, and Edges
  const isTimeActive = (validTo) =>
    validTo === null || validTo === undefined ||
    (currentTime !== null && currentTime !== undefined ? validTo > currentTime : false);

  nodeMap.forEach(node => {
    if ((node.type === 'State' || node.type === 'Defect') && node.properties) {
      node.properties.isCurrent = isTimeActive(node.properties.validTo);
    }
  });

  edges.forEach(edge => {
    edge.properties.isCurrent = isTimeActive(edge.properties.validTo);
  });

  if (!showHistory) {
    const activeEdges = edges.filter(e => e.properties.isCurrent !== false);
    const activeNodeIds = new Set();
    activeEdges.forEach(e => {
      activeNodeIds.add(e.from);
      activeNodeIds.add(e.to);
    });
    const activeNodes = Array.from(nodeMap.values()).filter(
      n => n.type === 'ActualIndividual' || n.properties?.isCurrent !== false || activeNodeIds.has(n.id)
    );
    return { nodes: activeNodes, edges: activeEdges };
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}