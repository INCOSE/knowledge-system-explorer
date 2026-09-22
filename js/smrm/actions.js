/**
 * DOMAIN ACTION FACTORIES (SMRM Layer)
 * ------------------------------------
 * This module contains pure factory functions responsible for validating
 * business rules and creating immutable Event objects.
 * 
 * Strict Architectural Rule:
 * Functions here MUST NOT import the singleton state or directly mutate data.
 * All functions are pure factories returning event descriptors to be dispatched.
 */

/**
 * Creates an event representing the addition of a new part to a parent component.
 * Pure factory function - does not mutate any external state.
 * 
 * @param {string} parentId - The unique identifier of the parent node.
 * @param {string} partName - The raw string name/identifier of the new part.
 * @param {number} [currentTime=0] - The current system timestamp.
 * @param {number|string|null} [edgeSequence=null] - Optional sequence number or ID for the relationship.
 * @param {Array} [existingEvents=[]] - Optional list of existing events to validate uniqueness.
 * @returns {Object|null} The created relationship event object, or null if validation fails.
 */
export function createAddPartEvent(parentId, partName, currentTime = 0, edgeSequence = null, existingEvents = []) {
  if (!parentId || !partName) return null;
  
  const trimmedParent = String(parentId).trim();
  const trimmedPart = String(partName).trim();
  
  // Rule 1: A node cannot be a parent to itself
  if (!trimmedParent || !trimmedPart || trimmedParent === trimmedPart) {
    return null;
  }

  // Rule 2: Prevent duplicating an active edge between the same parent and child
  if (Array.isArray(existingEvents) && existingEvents.length > 0) {
    const edgeExists = existingEvents.some(e => 
      e.from === trimmedParent && 
      e.to === trimmedPart && 
      e.valid_to === null
    );
    
    if (edgeExists) {
      console.warn(`[SMRM] Active edge already exists between ${trimmedParent} and ${trimmedPart}`);
      return null;
    }
  }

  const eventId = edgeSequence != null 
    ? (typeof edgeSequence === 'number' ? `e${edgeSequence}` : String(edgeSequence))
    : null;

  return {
    id: eventId,
    from: trimmedParent,
    to: trimmedPart,
    valid_from: currentTime,
    valid_to: null // null indicates the relationship is active indefinitely
  };
}

/**
 * Creates an event representing the severing (closing) of an active relationship.
 * Pure factory function - does not mutate any external state.
 * 
 * @param {string} edgeId - The unique identifier of the edge/relationship to sever.
 * @param {number} [currentTime=0] - The timestamp at which the relationship is severed.
 * @param {Array} [existingEvents=[]] - Optional list of existing events to validate against.
 * @returns {Object|null} The relationship closure descriptor, or null if validation fails.
 */
export function createRemoveEdgeEvent(edgeId, currentTime = 0, existingEvents = []) {
  if (!edgeId) return null;
  
  const strEdgeId = String(edgeId);

  // Rule: Validate that the edge exists and is currently active
  if (Array.isArray(existingEvents) && existingEvents.length > 0) {
    const edge = existingEvents.find(e => e.id === strEdgeId);
    if (!edge) {
      console.error(`[SMRM] Cannot sever relation. Edge ${strEdgeId} not found.`);
      return null;
    }
    if (edge.valid_to !== null) {
      console.warn(`[SMRM] Relation ${strEdgeId} is already closed.`);
      return null;
    }
  }

  return {
    type: 'EDGE_REMOVED',
    edgeId: strEdgeId,
    valid_to: currentTime
  };
}

// Aliases for terminology consistency and backwards compatibility
export const createCloseEdgeEvent = createRemoveEdgeEvent;
export const addPart = createAddPartEvent;
export const removeEdge = createRemoveEdgeEvent;
