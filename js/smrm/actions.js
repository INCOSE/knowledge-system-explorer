/**
 * DOMAIN ACTION FACTORIES (SMRM Layer)
 * ------------------------------------
 * This module contains pure factory functions responsible for creating
 * immutable business Domain Events for the Event Sourcing architecture.
 *
 * Strict Architectural Rule:
 * Functions here MUST NOT import the singleton state or directly mutate data.
 * All functions are pure factories returning event descriptors to be dispatched.
 */

import { RELATION_TYPES, inferEntityClass } from './definitions.js';

let localCounter = 1;

function nextIdSuffix(seq) {
  return seq !== null && seq !== undefined ? seq : localCounter++;
}

/**
 * Creates a business event representing the registration/creation of a domain entity.
 *
 * @param {string} partId - Unique business identifier of the entity.
 * @param {number} [timestamp=0] - Discrete system timestamp of registration.
 * @param {string|null} [entityClass=null] - Optional explicit domain class ('Vehicle' | 'Part' | 'Warehouse').
 * @param {number|null} [seq=null] - Optional monotonic sequence number.
 * @returns {Object|null} The created registration business event, or null if validation fails.
 */
export function createRegisterPartEvent(partId, timestamp = 0, entityClass = null, seq = null) {
  if (!partId) return null;
  const trimmedId = String(partId).trim();
  if (!trimmedId) return null;

  const resolvedClass = inferEntityClass(trimmedId, entityClass);

  return {
    id: `evt_reg_${trimmedId}_${timestamp}_${nextIdSuffix(seq)}`,
    type: 'REGISTER_PART',
    partId: trimmedId,
    entityClass: resolvedClass,
    valid_from: timestamp,
    valid_to: null
  };
}

/**
 * Creates a business event representing the assembly or storage of a child part into a parent entity.
 *
 * @param {string} parentId - Unique business identifier of the parent entity/container.
 * @param {string} childId - Unique business identifier of the assembled child component.
 * @param {string} [relationType='mounted_in'] - Relationship category ('mounted_in' | 'stored_at' | 'has_part').
 * @param {number} [timestamp=0] - Discrete system timestamp of the assembly.
 * @param {number|null} [seq=null] - Optional monotonic sequence number.
 * @returns {Object|null} The created assembly business event, or null if validation fails.
 */
export function createAssembleEvent(parentId, childId, relationType = 'mounted_in', timestamp = 0, seq = null) {
  if (!parentId || !childId) return null;

  const trimmedParent = String(parentId).trim();
  const trimmedChild = String(childId).trim();

  if (!trimmedParent || !trimmedChild || trimmedParent === trimmedChild) {
    return null;
  }

  const validRelation = relationType && RELATION_TYPES.includes(relationType)
    ? relationType
    : (relationType ? String(relationType).trim() : 'mounted_in');

  return {
    id: `evt_asm_${trimmedChild}_${timestamp}_${nextIdSuffix(seq)}`,
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
 *
 * @param {string} targetId - Unique identifier of the part or vehicle bearing the defect.
 * @param {string} defectName - Defect category (e.g. 'crack', 'dent', 'wear').
 * @param {string|number} defectValue - Recorded measurement or severity value (e.g. '2mm').
 * @param {number} [timestamp=0] - Discrete system timestamp of the observation.
 * @param {number|null} [seq=null] - Optional monotonic sequence number.
 * @returns {Object|null} The created defect report business event, or null if validation fails.
 */
export function createReportDefectEvent(targetId, defectName, defectValue, timestamp = 0, seq = null) {
  if (!targetId || !defectName) return null;

  const trimmedTarget = String(targetId).trim();
  const trimmedDefect = String(defectName).trim();

  if (!trimmedTarget || !trimmedDefect) {
    return null;
  }

  return {
    id: `evt_def_${trimmedTarget}_${trimmedDefect}_${timestamp}_${nextIdSuffix(seq)}`,
    type: 'REPORT_DEFECT',
    targetId: trimmedTarget,
    defectName: trimmedDefect,
    defectValue: defectValue || 'present',
    valid_from: timestamp,
    valid_to: null
  };
}

/**
 * Creates a business event representing the revocation/repair of a previously reported defect.
 * Preserves Event Sourcing immutability instead of splicing the event log.
 *
 * @param {string} targetId - Identifier of the entity bearing the defect.
 * @param {string} defectName - Defect category being revoked/repaired.
 * @param {number} [timestamp=0] - Discrete system timestamp when revocation occurred.
 * @param {string|null} [targetEventId=null] - Optional specific REPORT_DEFECT event ID to close.
 * @param {number|null} [seq=null] - Optional monotonic sequence number.
 * @returns {Object|null} The created defect revocation business event.
 */
export function createRevokeDefectEvent(targetId, defectName, timestamp = 0, targetEventId = null, seq = null) {
  if (!targetId || !defectName) return null;

  const trimmedTarget = String(targetId).trim();
  const trimmedDefect = String(defectName).trim();
  if (!trimmedTarget || !trimmedDefect) return null;

  return {
    id: `evt_rev_${trimmedTarget}_${trimmedDefect}_${timestamp}_${nextIdSuffix(seq)}`,
    type: 'REVOKE_DEFECT',
    targetId: trimmedTarget,
    defectName: trimmedDefect,
    targetEventId: targetEventId || null,
    valid_from: timestamp
  };
}

/**
 * Creates a business event representing the dismantling or removal of a component.
 *
 * @param {string} childId - Unique business identifier of the dismantled component.
 * @param {number} [timestamp=0] - Discrete system timestamp when dismantling occurred.
 * @param {number|null} [seq=null] - Optional monotonic sequence number.
 * @returns {Object|null} The created dismantling business event, or null if validation fails.
 */
export function createDismantleEvent(childId, timestamp = 0, seq = null) {
  if (!childId) return null;

  const trimmedChild = String(childId).trim();
  if (!trimmedChild) return null;

  return {
    id: `evt_dsm_${trimmedChild}_${timestamp}_${nextIdSuffix(seq)}`,
    type: 'DISMANTLE',
    childId: trimmedChild,
    valid_from: timestamp
  };
}