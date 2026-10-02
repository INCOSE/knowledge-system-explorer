import { reactive } from 'vue';
export { ENTITY_CLASSES, RELATION_TYPES } from './smrm/definitions.js';

/**
 * SINGLE SOURCE OF TRUTH (Event Sourcing)
 * ---------------------------------------
 * This module holds the pure domain reactive state of the application.
 * According to architecture guidelines, UI settings and visual graph
 * configurations are never stored here.
 * 
 * We only store the absolute domain truth:
 * - Current Time dimension
 * - Event Log (domain business events over time)
 * - Edge/Event sequence counter
 * - Domain settings (e.g. Naive defect target variant)
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

  // 5. The Event Log (The core of our Domain-Driven Event Sourcing)
  // Format: Pure business events (e.g. REGISTER_PART, ASSEMBLE, REPORT_DEFECT, DISMANTLE)
  eventLog: [],

  // 6. Counter to ensure unique identifiers for events
  edgeSequence: 1,

  // 7. Perspective View ('SMRM' | 'SMIM' | 'SMS')
  perspective: 'SMRM',

  // 8. Visual Graph Engine ('VIS' | 'MERMAID')
  graphEngine: 'VIS'
});

/**
 * Advances the global system time by one unit (T = T + 1).
 * Because 'state' is reactive, calling this will automatically trigger UI updates.
 */
export function advanceTime() {
  state.currentTime++;
}

/**
 * Completely replaces the current domain state.
 * Useful for loading a saved JSON file or injecting a predefined scenario.
 * 
 * @param {Object} newState - The data object containing the state to inject.
 */
export function loadState(newState) {
  if (newState.currentView !== undefined) {
    state.currentView = newState.currentView;
  }

  if (newState.userRole !== undefined) {
    state.userRole = newState.userRole;
  }

  if (newState.ontology !== undefined) {
    state.ontology = newState.ontology;
  }

  if (newState.currentTime !== undefined) {
    state.currentTime = newState.currentTime;
  }
  
  if (newState.eventLog) {
    state.eventLog.splice(0, state.eventLog.length, ...newState.eventLog);
  }
  
  if (newState.edgeSequence !== undefined) {
    state.edgeSequence = newState.edgeSequence;
  }

  if (newState.perspective !== undefined) {
    state.perspective = newState.perspective;
  }

  if (newState.graphEngine !== undefined) {
    state.graphEngine = newState.graphEngine;
  }
}

