import { reactive } from 'vue';

/**
 * SINGLE SOURCE OF TRUTH (Event Sourcing)
 * ---------------------------------------
 * This module holds the pure domain reactive state of the application.
 * According to architecture guidelines, UI settings and visual graph
 * configurations are never stored here.
 * 
 * We only store the absolute domain truth:
 * - Current Time dimension
 * - Event Log (temporal relationships over time)
 * - Edge sequence counter
 */
export const state = reactive({
  // 1. Global Time Dimension
  currentTime: 0,

  // 2. The Event Log (The core of our Event Sourcing)
  // Format: { id: 'e1', from: 'Parent', to: 'Child', valid_from: 0, valid_to: null }
  // A 'null' valid_to indicates the relationship is currently active.
  eventLog: [],

  // 3. Counter to ensure unique IDs for our events/edges
  edgeSequence: 1
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
 * Useful for loading a saved JSON file or injecting a predefined Scenario.
 * 
 * @param {Object} newState - The data object containing the state to inject.
 */
export function loadState(newState) {
  if (newState.currentTime !== undefined) {
    state.currentTime = newState.currentTime;
  }
  
  if (newState.eventLog) {
    state.eventLog.splice(0, state.eventLog.length, ...newState.eventLog);
  }
  
  if (newState.edgeSequence !== undefined) {
    state.edgeSequence = newState.edgeSequence;
  }
}
