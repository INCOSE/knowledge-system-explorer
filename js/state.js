import { reactive } from 'vue';
export { ENTITY_CLASSES, RELATION_TYPES, inferEntityClass } from './smrm/definitions.js';

/**
 * SINGLE SOURCE OF TRUTH (Event Sourcing & Workbench State)
 * ---------------------------------------------------------
 * Central reactive store eliminating duplicate state/settings watchers.
 *
 * Perspective values (4 unified viewpoints):
 * - 'SMRM'    : Engineer Perspective (domain hierarchy, slots/states collapsed)
 * - 'SMIM'    : Logical Perspective (canonical 3D BFO / 4D ISO 15926 / Naive topology)
 * - 'SMS_LPG' : Physical LPG Perspective (Property Graph storage & state transitions)
 * - 'SMS_RDF' : Physical RDF Perspective (W3C RDF triples, reification & literals)
 */
export const state = reactive({
  // 1. Navigation View ('MENU' | 'SANDBOX' | 'SCENARIO')
  currentView: 'MENU',

  // 2. User Role ('UNI_ENGINEER')
  userRole: 'UNI_ENGINEER',

  // 3. Global Time Dimension
  currentTime: 0,

  // 4. Current Domain Ontology ('NAIVE_NODE' | 'NAIVE_EDGE' | 'BFO' | 'ISO15926')
  ontology: 'NAIVE_NODE',

  // 5. Unified Perspective ('SMRM' | 'SMIM' | 'SMS_LPG' | 'SMS_RDF')
  perspective: 'SMRM',

  // 6. Active Physical Storage Paradigm ('LPG' | 'RDF')
  // Automatically switched when selecting 'SMS_LPG' or 'SMS_RDF'
  storage: 'LPG',

  // 7. Visual Graph Engine ('VIS' | 'MERMAID')
  graphEngine: 'VIS',

  // 8. UI Locale ('sv' | 'en' | 'ru')
  language: 'en',

  // 9. Toggle visibility of historical (closed) relationships
  showHistory: true,

  // 10. The Event Log (Pure business events)
  eventLog: [],

  // 11. Monotonic counter for unique event IDs
  edgeSequence: 1
});

/**
 * Advances the global system time by one unit (T = T + 1).
 */
export function advanceTime() {
  state.currentTime++;
}

/**
 * Returns the next monotonic sequence integer and increments the counter.
 * @returns {number}
 */
export function nextSequence() {
  return state.edgeSequence++;
}

/**
 * Sets the active perspective and synchronises the physical storage mode ('LPG' | 'RDF')
 * so that UNDER THE BONNET and DATABASE QUERY always match the selected Physical view.
 *
 * @param {'SMRM'|'SMIM'|'SMS_LPG'|'SMS_RDF'|'SMS'} newPerspective
 */
export function setPerspective(newPerspective) {
  if (newPerspective === 'SMS_LPG') {
    state.perspective = 'SMS_LPG';
    state.storage = 'LPG';
  } else if (newPerspective === 'SMS_RDF') {
    state.perspective = 'SMS_RDF';
    state.storage = 'RDF';
  } else if (newPerspective === 'SMS') {
    state.perspective = state.storage === 'RDF' ? 'SMS_RDF' : 'SMS_LPG';
  } else if (newPerspective === 'SMIM' || newPerspective === 'SMRM') {
    state.perspective = newPerspective;
  }
}

/**
 * Completely replaces or updates the current state from a saved JSON object or scenario.
 *
 * @param {Object} newState - State payload to inject.
 */
export function loadState(newState) {
  if (!newState || typeof newState !== 'object') return;

  if (newState.currentView !== undefined) {
    state.currentView = newState.currentView;
  }
  if (newState.userRole !== undefined) {
    state.userRole = newState.userRole;
  }
  if (newState.ontology !== undefined) {
    const onto = newState.ontology;
    state.ontology = onto === 'ISO_15926_4D' ? 'ISO15926' : (onto === 'NAIVE' ? 'NAIVE_NODE' : onto);
  }
  if (newState.storage === 'LPG' || newState.storage === 'RDF') {
    state.storage = newState.storage;
  }
  if (newState.perspective !== undefined) {
    setPerspective(newState.perspective);
  }
  if (newState.currentTime !== undefined) {
    state.currentTime = newState.currentTime;
  }
  if (Array.isArray(newState.eventLog)) {
    state.eventLog.splice(0, state.eventLog.length, ...newState.eventLog);
  }
  if (newState.edgeSequence !== undefined) {
    state.edgeSequence = newState.edgeSequence;
  }
  if (newState.graphEngine !== undefined) {
    state.graphEngine = String(newState.graphEngine).toUpperCase() === 'MERMAID' ? 'MERMAID' : 'VIS';
  }
  if (newState.language !== undefined) {
    state.language = newState.language;
  }
  if (newState.showHistory !== undefined) {
    state.showHistory = Boolean(newState.showHistory);
  }
}