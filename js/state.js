import { reactive } from 'vue';

/**
 * SINGLE SOURCE OF TRUTH (Event Sourcing & App State)
 * ---------------------------------------------------
 */

export const state = reactive({
  currentView: 'MENU',
  userRole: 'UNI_ENGINEER',
  ontology: 'BFO',
  perspective: 'SMRM',
  storage: 'LPG',
  graphEngine: 'VIS',
  language: 'en',
  showHistory: true,
  currentTime: 0,
  edgeSequence: 1,
  eventLog: [],

  // --- NEW: Narrative Figures & QDIKW Mode State ---
  figureOverlay: {
    visible: false,
    src: '',
    caption: '',
    attributionHtml: ''
  },
  
  qdikw: {
    active: false,
    stage: 'INTRO', // 'INTRO', 'Q', 'D', 'I', 'K', 'W'
    activeRole: '',
    roleBadge: '',
    questionText: '',
    slotMetadata: {}, // Хранит { SLOT_ID: { loadRegime: '...', safetyFunction: '...' } }
    rules: {
      rule1: false, // Наследование контекста (Slot -> Stress)
      rule2: false, // Физика материалов (Stress + Crack > 10 -> Fracture)
      rule3: false  // Функциональная безопасность (Fracture + Steering -> Loss of Control)
    }
  }
});

export function advanceTime() {
  state.currentTime++;
}

export function setPerspective(view) {
  state.perspective = view;
}

export function nextSequence() {
  return state.edgeSequence++;
}

export function loadState(newState) {
  if (newState.ontology) state.ontology = newState.ontology;
  if (newState.perspective) state.perspective = newState.perspective;
  if (newState.storage) state.storage = newState.storage;
  if (newState.graphEngine) state.graphEngine = newState.graphEngine;
  if (newState.language) state.language = newState.language;
  if (newState.showHistory !== undefined) state.showHistory = newState.showHistory;
  if (newState.currentTime !== undefined) state.currentTime = newState.currentTime;
  if (newState.edgeSequence !== undefined) state.edgeSequence = newState.edgeSequence;
  if (newState.eventLog) {
    state.eventLog.splice(0, state.eventLog.length, ...newState.eventLog);
  }
}