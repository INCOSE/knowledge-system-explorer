import { state } from '../state.js';

/**
 * DOMAIN ACTIONS (SMRM Layer)
 * ---------------------------
 * This module is responsible for validating business logic and user actions
 * before generating Events and appending them to the Event Log in state.js.
 * 
 * Strict Rule: No UI logic here. Only data mutation rules.
 */

/**
 * Adds a new component (Part) to a Parent element.
 * 
 * @param {string} parentId - The ID of the parent node.
 * @param {string} partName - The raw string name of the new part.
 */
export function addPart(parentId, partName) {
  if (!partName || !parentId) return;
  
  const partId = partName.trim();
  
  // Rule 1: Cannot be parent to itself
  if (parentId === partId) return;

  // Rule 2: Prevent duplicating an active edge between the same parent and child
  const edgeExists = state.eventLog.some(e => 
    e.from === parentId && 
    e.to === partId && 
    e.valid_to === null
  );
  
  if (edgeExists) {
    console.warn(`[SMRM] Active edge already exists between ${parentId} and ${partId}`);
    return;
  }

  // Rule 3: If the node doesn't exist in our Concept Repository, create it
  const nodeExists = state.nodes.some(n => n.id === partId);
  if (!nodeExists) {
    state.nodes.push({ id: partId, label: partId, type: 'element' });
  }

  // Generate the Event and push to Event Log
  const eventId = 'e' + state.edgeSequence++;
  state.eventLog.push({
    id: eventId,
    from: parentId,
    to: partId,
    valid_from: state.currentTime,
    valid_to: null // null means 'active until further notice'
  });
}

/**
 * Removes (severs) an active relationship between a Parent and a Child.
 * In an Event Sourced system, we don't delete the edge, we "close" it
 * by setting valid_to = currentTime.
 * 
 * @param {string} edgeId - The ID of the edge/relationship to sever.
 */
export function removeEdge(edgeId) {
  // Find the exact event/edge
  const edgeIndex = state.eventLog.findIndex(e => e.id === edgeId);
  
  if (edgeIndex === -1) {
    console.error(`[SMRM] Cannot sever relation. Edge ${edgeId} not found.`);
    return;
  }

  const edge = state.eventLog[edgeIndex];

  // Rule 4: We can only sever active edges
  if (edge.valid_to !== null) {
    console.warn(`[SMRM] Relation ${edgeId} is already closed.`);
    return;
  }

  // Close the temporal validity of the relationship
  edge.valid_to = state.currentTime;
}