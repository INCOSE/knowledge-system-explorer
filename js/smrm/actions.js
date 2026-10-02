/**
 * DOMAIN ACTION FACTORIES (SMRM Layer)
 * ------------------------------------
 * This module contains pure factory functions responsible for creating
 * immutable business Domain Events for the Event Sourcing architecture.
 * 
 * In accordance with Domain-Driven Event Sourcing:
 * - Events represent pure business facts, NOT low-level graph mutations.
 * - No graph concepts (e.g. 'NODE', 'EDGE') exist at this layer.
 * 
 * Strict Architectural Rule:
 * Functions here MUST NOT import the singleton state or directly mutate data.
 * All functions are pure factories returning event descriptors to be dispatched.
 */

import { RELATION_TYPES } from './definitions.js';

/**
 * Creates a business event representing the registration/creation of a domain part.
 * Pure factory function - does not mutate any external state.
 * 
 * @param {string} partId - The unique business identifier of the part or component.
 * @param {number} [timestamp=0] - The discrete system timestamp of the registration.
 * @returns {Object|null} The created registration business event, or null if validation fails.
 */
export function createRegisterPartEvent(partId, timestamp = 0) {
  if (!partId) return null;
  const trimmedId = String(partId).trim();
  if (!trimmedId) return null;

  return {
    id: `evt_reg_${trimmedId}`,
    type: 'REGISTER_PART',
    partId: trimmedId,
    valid_from: timestamp,
    valid_to: null
  };
}

/**
 * Creates a business event representing the assembly or containment of a child part into a parent entity.
 * Pure factory function - does not mutate any external state.
 * 
 * @param {string} parentId - The unique business identifier of the parent entity/container.
 * @param {string} childId - The unique business identifier of the assembled child component.
 * @param {string} [relationType='mounted_in'] - The relationship category (e.g. 'mounted_in', 'stored_at').
 * @param {number} [timestamp=0] - The discrete system timestamp of the assembly.
 * @returns {Object|null} The created assembly business event, or null if validation fails.
 */
export function createAssembleEvent(parentId, childId, relationType = 'mounted_in', timestamp = 0) {
  if (!parentId || !childId) return null;

  const trimmedParent = String(parentId).trim();
  const trimmedChild = String(childId).trim();

  // Rule 1: An entity cannot be assembled into itself
  if (!trimmedParent || !trimmedChild || trimmedParent === trimmedChild) {
    return null;
  }

  const validRelation = relationType && RELATION_TYPES.includes(relationType)
    ? relationType
    : (relationType ? String(relationType).trim() : 'mounted_in');

  return {
    id: `evt_asm_${trimmedChild}_${timestamp}`,
    type: 'ASSEMBLE',
    parentId: trimmedParent,
    childId: trimmedChild,
    relationType: validRelation,
    valid_from: timestamp,
    valid_to: null
  };
}

/**
 * Creates a business event reporting a physical defect or quality observation on an entity.
 * Pure factory function - targetId is ALWAYS the Part/Vehicle ID, never a relationship/edge ID.
 * 
 * @param {string} targetId - The unique identifier of the part or vehicle bearing the defect.
 * @param {string} defectName - The characteristic or defect category (e.g. 'crack', 'dent', 'wear').
 * @param {string|number} defectValue - The recorded measurement or severity value (e.g. '2mm', 'high').
 * @param {number} [timestamp=0] - The discrete system timestamp of the defect observation.
 * @returns {Object|null} The created defect report business event, or null if validation fails.
 */
export function createReportDefectEvent(targetId, defectName, defectValue, timestamp = 0) {
  if (!targetId || !defectName) return null;

  const trimmedTarget = String(targetId).trim();
  const trimmedDefect = String(defectName).trim();

  if (!trimmedTarget || !trimmedDefect) {
    return null;
  }

  return {
    id: `evt_def_${trimmedTarget}_${trimmedDefect}_${timestamp}`,
    type: 'REPORT_DEFECT',
    targetId: trimmedTarget,
    defectName: trimmedDefect,
    defectValue: defectValue,
    valid_from: timestamp,
    valid_to: null
  };
}

/**
 * Creates a business event representing the dismantling or removal of a component.
 * Pure factory function - does not mutate any external state.
 * 
 * @param {string} childId - The unique business identifier of the dismantled component.
 * @param {number} [timestamp=0] - The discrete system timestamp when dismantling occurred.
 * @returns {Object|null} The created dismantling business event, or null if validation fails.
 */
export function createDismantleEvent(childId, timestamp = 0) {
  if (!childId) return null;

  const trimmedChild = String(childId).trim();
  if (!trimmedChild) return null;

  return {
    id: `evt_dsm_${trimmedChild}_${timestamp}`,
    type: 'DISMANTLE',
    childId: trimmedChild,
    valid_from: timestamp
  };
}

