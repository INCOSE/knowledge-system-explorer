/**
 * SMRM DEFINITIONS & DOMAIN VOCABULARY
 * ------------------------------------
 * Standard domain vocabulary, reference model definitions, and shared
 * classification helpers for the IEC 63339 Knowledge Architecture Workbench.
 */

/**
 * Standard manufacturing domain entity classes.
 * @type {ReadonlyArray<string>}
 */
export const ENTITY_CLASSES = Object.freeze([
  'Vehicle',
  'Slot',
  'Part',
  'Defect',
  'Warehouse'
]);

/**
 * Standard manufacturing domain relationship types.
 * @type {ReadonlyArray<string>}
 */
export const RELATION_TYPES = Object.freeze([
  'has_slot',
  'mounted_in',
  'stored_at',
  'has_defect',
  'has_part'
]);

/**
 * Internal metadata property keys that should be hidden when rendering
 * domain/custom property payloads on graph nodes, edges, and tables.
 * @type {ReadonlyArray<string>}
 */
export const INTERNAL_PROPERTY_KEYS = Object.freeze([
  'isCurrent',
  'originalId',
  'entityType',
  'entityClass',
  'validFrom',
  'validTo',
  'ownerId',
  'childId',
  'parentId',
  'childStateId',
  'parentStateId',
  'qualityType',
  'bearerId',
  'defectType',
  'targetId',
  'value',
  'atTime',
  'originalEdgeId'
]);

/**
 * Infers the manufacturing domain entity class from an explicit override
 * or identifier naming conventions.
 *
 * @param {string} id - Node or part identifier.
 * @param {string|null} [explicitClass=null] - Optional explicit class override.
 * @returns {string} Resolved entity class ('Vehicle' | 'Slot' | 'Part' | 'Defect' | 'Warehouse').
 */
export function inferEntityClass(id, explicitClass = null) {
  if (explicitClass && ENTITY_CLASSES.includes(explicitClass)) {
    return explicitClass;
  }
  if (!id) return 'Part';
  const cleanId = String(id).replace(/^(4d_|st_)/i, '');
  if (/^(veh|sys|car)/i.test(cleanId)) return 'Vehicle';
  if (/^slot/i.test(cleanId)) return 'Slot';
  if (/^(ware|wh|stor)/i.test(cleanId)) return 'Warehouse';
  if (/^(def|qual)/i.test(cleanId)) return 'Defect';
  return 'Part';
}