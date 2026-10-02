/**
 * SMRM DEFINITIONS & DOMAIN VOCABULARY
 * ------------------------------------
 * Standard domain vocabulary and reference model definitions for the 
 * IEC 63339 Knowledge Architecture Workbench.
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
  'has_defect'
]);

