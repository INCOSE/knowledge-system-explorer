import { reactive } from 'vue';

/**
 * SINGLE SOURCE OF TRUTH (Event Sourcing)
 * ---------------------------------------
 * This module holds the entire reactive state of the application.
 * According to the architecture guidelines, we NEVER mutate or store
 * visual graph nodes (like Vis.js or Mermaid configurations) here.
 * 
 * We only store the absolute truth: Settings, Current Time, 
 * the known Entities (Nodes), and the Event Log (Relationships over time).
 */
export const state = reactive({
  // 1. Application Settings (UI & TLO/DB selection)
  settings: {
    language: 'sv',         // Available options: 'sv', 'en', 'ru'
    ontology: 'BFO',        // SMIM Top-Level Ontology: 'BFO' or 'ISO15926'
    storage: 'LPG',         // SMS Storage Paradigm: 'LPG' or 'RDF'
    engine: 'vis'           // Renderer: 'vis' (Vis.js) or 'mermaid'
  },

  // 2. Global Time Dimension
  currentTime: 0,

  // 3. Concept Repository (SMRM) - Base Entities
  // This stores the static identifiers of our system elements.
  nodes: [
    { id: 'System_A', label: 'System_A', type: 'system' }
  ],

  // 4. The Event Log (The core of our Event Sourcing)
  // Instead of modifying a graph directly, we log temporal events.
  // Format: { id: 'e1', from: 'Parent', to: 'Child', valid_from: 0, valid_to: null }
  // A 'null' valid_to indicates the relationship is currently active.
  eventLog: [],

  // Counter to ensure unique IDs for our events/edges
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
 * Completely replaces the current state.
 * Useful for loading a saved JSON file or injecting a predefined Scenario (Edge Case).
 * 
 * @param {Object} newState - The data object containing the state to inject.
 */
export function loadState(newState) {
  if (newState.settings) {
    Object.assign(state.settings, newState.settings);
  }
  
  if (newState.currentTime !== undefined) {
    state.currentTime = newState.currentTime;
  }
  
  if (newState.nodes) {
    // Empty the array and push new items to maintain Vue reactivity
    state.nodes.splice(0, state.nodes.length, ...newState.nodes);
  }
  
  if (newState.eventLog) {
    state.eventLog.splice(0, state.eventLog.length, ...newState.eventLog);
  }
  
  if (newState.edgeSequence !== undefined) {
    state.edgeSequence = newState.edgeSequence;
  }
}