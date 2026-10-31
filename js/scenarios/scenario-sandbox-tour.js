/**
 * SCENARIO 0: INTERACTIVE SANDBOX & ARCHITECTURE TOUR
 * ---------------------------------------------------
 * Explains the journey from real-world engineering queries to useful knowledge,
 * walks through the UI controls, performs live sandbox operations (registering,
 * installing, advancing time, reporting defects, dismantling), and switches
 * across Ontologies (SMIM) and Perspectives (URMSM / SMRM / SMS).
 */

import { setPerspective, nextSequence } from '../state.js';
import {
  createRegisterPartEvent,
  createAssembleEvent,
  createReportDefectEvent,
  createDismantleEvent
} from '../smrm/actions.js';

let lastExecutedStep = -1;

function clearHighlights() {
  document.querySelectorAll('.tour-pulse-highlight').forEach(el => {
    el.classList.remove('tour-pulse-highlight');
  });
}

function highlightElement(selector) {
  clearHighlights();
  if (!selector) return;
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add('tour-pulse-highlight');
  }
}

export const sandboxTourScenario = {
  id: 'SANDBOX_TOUR',
  title: 'Interactive Tour: How the Workbench Works',
  audioSrc: './narratives/Ontologies_-_Sandbox_Tour.mp3', // Убедись, что MP3 называется так!
  fallbackDuration: 186, // Общая длительность аудио 3м 5с

  // Хардкодим субтитры из сгенерированного SRT
  subtitles: [
    { start: 0.14, end: 2.52, text: "Welcome to the Knowledge Architecture Workbench." },
    { start: 3.36, end: 8.16, text: "Every day, engineers ask seemingly simple questions about complex products." },
    { start: 8.88, end: 12.86, text: "Which exact component was installed in this vehicle when a failure occurred?" },
    { start: 13.66, end: 18.30, text: "Yet, before a real-world question can become useful knowledge, data must pass" },
    { start: 18.30, end: 23.64, text: "through several architectural layers, from domain concepts and formal logic down to" },
    { start: 23.64, end: 25.10, text: "physical database tables." },
    { start: 25.82, end: 30.12, text: "This interactive tool demonstrates how different graph technologies handle that" },
    { start: 30.12, end: 34.48, text: "journey, exposing the hidden traps in designing knowledge management systems." },
    { start: 35.20, end: 38.94, text: "You can explore pre-recorded edge cases, like this guided tour," },
    { start: 39.54, end: 44.46, text: "or use the open sandbox to build your own structures and switch storage modes on the fly." },
    { start: 47.14, end: 48.78, text: "Let's see the sandbox in action." },
    { start: 49.56, end: 53.22, text: "Using the operations toolbar, we act as the domain engineer." },
    { start: 54.88, end: 60.28, text: "Let's install a new component, Pump_B, into System_A." },
    { start: 61.38, end: 64.04, text: "Look at the BOM tree structure on the top right." },
    { start: 64.72, end: 70.60, text: "Regardless of the underlying database, the engineer's viewpoint remains a clean, familiar hierarchy." },
    { start: 73.30, end: 80.22, text: "Now, let's advance the clock to T equals 1 and report a 2 millimeter crack on Part_A." },
    { start: 81.64, end: 82.54, text: "Watch the canvas." },
    { start: 83.20, end: 88.74, text: "In this naive graph mode, where we model data without strict ontological rules, the" },
    { start: 88.74, end: 93.30, text: "defect simply overwrites the node's label, destroying its prior history." },
    { start: 94.50, end: 100.94, text: "If we now ask what Part_A looked like at T equals 0, the database will falsely claim" },
    { start: 100.94, end: 102.24, text: "it was born defective." },
    { start: 104.66, end: 109.94, text: "Let's step forward to T equals 2 and dismantle the broken Part_A." },
    { start: 111.96, end: 116.88, text: "Now, let's pull the architectural levers at the top left without losing our history." },
    { start: 117.90, end: 119.38, text: "Switching to BFO," },
    { start: 120.00, end: 125.24, text: "3D continuance, keeps the physical part unchanged through time, attaching the" },
    { start: 125.24, end: 127.72, text: "crack as a separate dependent quality node." },
    { start: 130.20, end: 138.38, text: "Switching to ISO 15926, 4D extents, treats objects as spatiotemporal worms." },
    { start: 140.00, end: 146.14, text: "Notice how the crack at T equals 1 forced the system to slice both Part_A and" },
    { start: 146.14, end: 153.22, text: "System_A into new immutable temporal states, preserving a mathematically pristine audit trail." },
    { start: 155.56, end: 162.48, text: "Finally, look at the bottom right panels as we toggle between LPG and W3CRDF." },
    { start: 164.40, end: 170.46, text: "Under the Bonnet translates our live graph into raw database tables, or RDF triples," },
    { start: 170.46, end: 176.44, text: "in real time, while Database Query reveals the exact Cypher or SPARQL code" },
    { start: 176.44, end: 178.86, text: "required to extract knowledge at time T." },
    { start: 179.84, end: 185.60, text: "Feel free to replay any step, load another scenario, or experiment with the controls yourself." }
  ],

  // Действия интерфейса точно подогнаны под таймкоды аудио
  timeline: [
    {
      // Step 0 (0s): Исходная инициализация песочницы на T=0
      time: 0,
      action: (state, renderGraph) => {
        state.eventLog.splice(0, state.eventLog.length);
        state.currentTime = 0;
        state.edgeSequence = 1;
        state.ontology = 'NAIVE_NODE';
        setPerspective('SMRM');
        state.graphEngine = 'VIS';
        state.showHistory = true;

        state.eventLog.push(
          createRegisterPartEvent('System_A', 0, 'Vehicle', nextSequence()),
          createRegisterPartEvent('SubAssembly_1', 0, 'Part', nextSequence()),
          createAssembleEvent('System_A', 'SubAssembly_1', 'mounted_in', 0, nextSequence()),
          createRegisterPartEvent('Part_A', 0, 'Part', nextSequence()),
          createAssembleEvent('System_A', 'Part_A', 'mounted_in', 0, nextSequence()),
          createRegisterPartEvent('Sensor_X', 0, 'Part', nextSequence()),
          createAssembleEvent('SubAssembly_1', 'Sensor_X', 'mounted_in', 0, nextSequence()),
          createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', nextSequence())
        );

        highlightElement('#canvas-container');
        renderGraph();
      }
    },
    {
      // "Let's install a new component, Pump_B, into System_A."
      time: 54.88,
      action: (state, renderGraph) => {
        state.eventLog.push(
          createRegisterPartEvent('Pump_B', 0, 'Part', nextSequence()),
          createAssembleEvent('System_A', 'Pump_B', 'mounted_in', 0, nextSequence())
        );
        highlightElement('#biz-inst-btn');
        renderGraph();
      }
    },
    {
      // "Look at the BOM tree structure on the top right."
      time: 61.38,
      action: (state, renderGraph) => {
        highlightElement('#tree-container');
        renderGraph();
      }
    },
    {
      // "Now, let's advance the clock to T equals 1 and report a 2 millimeter crack on Part_A."
      time: 73.30,
      action: (state, renderGraph) => {
        state.currentTime = 1;
        setPerspective('SMIM');
        state.eventLog.push(
          createReportDefectEvent('Part_A', 'crack', '2mm', 1, nextSequence())
        );
        highlightElement('#biz-def-btn');
        renderGraph();
      }
    },
    {
      // "Let's step forward to T equals 2 and dismantle the broken Part_A."
      time: 104.66,
      action: (state, renderGraph) => {
        state.currentTime = 2;
        state.eventLog.push(
          createDismantleEvent('Part_A', 2, nextSequence()),
          createAssembleEvent('Warehouse_1', 'Part_A', 'stored_at', 2, nextSequence())
        );
        highlightElement('#biz-store-btn');
        renderGraph();
      }
    },
    {
      // "Switching to BFO..."
      time: 117.90,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        setPerspective('SMIM');
        highlightElement('#ctrl-onto-bfo');
        renderGraph();
      }
    },
    {
      // "Switching to ISO 15926..."
      time: 130.20,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        setPerspective('SMIM');
        highlightElement('#ctrl-onto-iso');
        renderGraph();
      }
    },
    {
      // "Finally, look at the bottom right panels as we toggle between LPG and W3CRDF."
      time: 155.56,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        setPerspective('SMS_RDF');
        state.storage = 'RDF';
        highlightElement('#storage-content');
        renderGraph();
      }
    },
    {
      // "while Database Query reveals the exact Cypher or SPARQL code..."
      time: 170.46,
      action: (state, renderGraph) => {
        setPerspective('SMS_LPG');
        state.storage = 'LPG';
        highlightElement('#query-content');
        renderGraph();
      }
    }
  ]
};

export function resetSandboxTourTimeline(targetTime = 0) {
  lastExecutedStep = -1;
  clearHighlights();
}

export function onSandboxTourTimeUpdate(currentTime, state, renderGraph) {
  const steps = sandboxTourScenario.timeline;
  for (let i = 0; i < steps.length; i++) {
    if (currentTime >= steps[i].time && i > lastExecutedStep) {
      lastExecutedStep = i;
      steps[i].action(state, renderGraph);
    }
  }
}