/**
 * SCENARIO: THE VANISHING CRACK
 * -----------------------------
 * Narrative subtitle data and chronological action timeline
 * synchronised with audio playback.
 */

import {
  createRegisterPartEvent,
  createAssembleEvent,
  createReportDefectEvent,
  createDismantleEvent
} from '../smrm/actions.js';
import { setPerspective } from '../state.js';

/**
 * Highlights specified UI elements by IDs with a temporary glowing effect.
 *
 * @param {string[]} elementIds - Array of DOM element IDs to highlight.
 * @param {number} [duration=1200] - Duration of the highlight effect in milliseconds.
 */
export function highlightUI(elementIds, duration = 1200) {
  if (typeof document === 'undefined' || !Array.isArray(elementIds)) return;
  elementIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('scenario-highlight');
      setTimeout(() => {
        el.classList.remove('scenario-highlight');
      }, duration);
    }
  });
}

const subtitles = [
  { start: 0.14, end: 1.84, text: "Welcome to the Data Sandbox." },
  { start: 2.46, end: 7.50, text: "Currently, the system is operating in naive graph mode. We have no strict" },
  { start: 7.50, end: 10.62, text: "ontological rules, just nodes and relationships." },
  { start: 11.26, end: 13.78, text: "Let's model a typical manufacturing scenario." },
  { start: 15.50, end: 16.38, text: "We have a vehicle." },
  { start: 17.02, end: 22.02, text: "Within it, there is a suspension slot where part M01 is installed." },
  { start: 22.64, end: 23.84, text: "Everything is straightforward." },
  { start: 24.44, end: 27.06, text: "But what happens when a real-world problem occurs?" },
  { start: 28.62, end: 33.72, text: "During an inspection, a two-millimeter crack is discovered on part M01." },
  { start: 34.64, end: 37.06, text: "How do we store this fact in a naive graph?" },
  { start: 38.74, end: 40.44, text: "The developer faces a dilemma." },
  { start: 41.12, end: 45.72, text: "If we add the property crack two millimeters directly to the part node," },
  { start: 46.26, end: 50.32, text: "then when we try to query the car's condition a year ago, the system will" },
  { start: 50.32, end: 55.68, text: "answer that the part was already broken because the node exists outside of time." },
  { start: 55.68, end: 56.74, text: "It has been overwritten." },
  { start: 58.58, end: 63.08, text: "The obvious workaround is to attach the defect information to the temporal edge," },
  { start: 63.66, end: 64.40, text: "mounted_in." },
  { start: 66.02, end: 71.26, text: "Excellent. The crack is anchored in time. The inspector is satisfied, and the" },
  { start: 71.26, end: 73.08, text: "database has saved the information." },
  { start: 74.74, end: 76.26, text: "But then comes the next day." },
  { start: 77.00, end: 80.76, text: "The part is removed from the vehicle and sent to the warehouse for repair." },
  { start: 82.46, end: 87.68, text: "The mounting edge is closed and archived. The part is now linked to the warehouse." },
  { start: 88.46, end: 90.02, text: "Now, let's ask the system," },
  { start: 90.76, end: 93.60, text: "how many defective parts are currently in the warehouse?" },
  { start: 95.08, end: 96.14, text: "The system answers" },
  { start: 96.78, end: 97.20, text: "zero." },
  { start: 97.86, end: 102.02, text: "The crack has disappeared from the vehicle, but in the warehouse, the part is" },
  { start: 102.02, end: 106.96, text: "registered as completely flawless. The defect attribute remains buried in the" },
  { start: 106.96, end: 108.20, text: "archived mounting edge." },
  { start: 108.84, end: 112.92, text: "Our naive approach has just destroyed critical data about a fault." },
  { start: 114.50, end: 119.42, text: "This is exactly where the naive approach collapses and an industrial ontology is" },
  { start: 119.42, end: 124.68, text: "required. We are now switching the system to ISO 15926 mode." },
  { start: 126.06, end: 131.42, text: "Under this standard, a part is not a static node, but a four-dimensional object" },
  { start: 131.42, end: 133.08, text: "with temporal life stages." },
  { start: 133.76, end: 138.78, text: "A defect is an independent entity that classifies the condition of a specific" },
  { start: 138.78, end: 140.30, text: "temporal stage of the part." },
  { start: 141.06, end: 146.48, text: "Now, when moved to the warehouse, the part takes its state history with it. Data is" },
  { start: 146.48, end: 147.42, text: "no longer lost." }
];

export const vanishingCrackScenario = {
  subtitles,
  timeline: [
    // 1. t = 1.0: Initialize Naive Node mode, Logical (SMIM) perspective so slot & mounted_in edge are visible
    {
      id: 'step_1_0_init_naive',
      time: 1.0,
      executed: false,
      action(state) {
        state.ontology = 'NAIVE_NODE';
        setPerspective('SMIM');
        state.graphEngine = 'MERMAID';
      }
    },

    // 2. t = 15.5: Register Vehicle System_A
    {
      id: 'step_15_5_reg_vehicle',
      time: 15.5,
      executed: false,
      action(state) {
        highlightUI(['biz-reg-id', 'biz-reg-btn']);
        state.currentTime = 15.5;
        const event = createRegisterPartEvent('System_A', state.currentTime, 'Vehicle');
        if (event) state.eventLog.push(event);
      }
    },

    // 3. t = 18.0: Register Part_M01 and install in System_A (creates Slot_System_A_Part_M01)
    {
      id: 'step_18_0_reg_part_install',
      time: 18.0,
      executed: false,
      action(state) {
        highlightUI(['biz-reg-id', 'biz-inst-btn']);
        state.currentTime = 18.0;
        const regEvent = createRegisterPartEvent('Part_M01', state.currentTime, 'Part');
        if (regEvent) state.eventLog.push(regEvent);
        const asmEvent = createAssembleEvent('System_A', 'Part_M01', 'mounted_in', state.currentTime);
        if (asmEvent) state.eventLog.push(asmEvent);
      }
    },

    // 4. t = 43.0: Report Defect crack=2mm on Part_M01 (attached to NODE)
    {
      id: 'step_43_0_attach_crack_node',
      time: 43.0,
      executed: false,
      action(state) {
        highlightUI(['biz-def-target', 'biz-def-btn']);
        state.currentTime = 43.0;
        const event = createReportDefectEvent('Part_M01', 'crack', '2mm', state.currentTime);
        if (event) state.eventLog.push(event);
      }
    },

    // 5. t = 56.5: Rewind thought-experiment defect before switching strategy to NAIVE_EDGE
    {
      id: 'step_56_5_revoke_crack_node',
      time: 56.5,
      executed: false,
      action(state) {
        highlightUI(['biz-rev-defect', 'biz-rev-btn']);
        state.currentTime = 56.5;
        const idx = state.eventLog.findIndex(e => e.type === 'REPORT_DEFECT' && e.targetId === 'Part_M01');
        if (idx !== -1) state.eventLog.splice(idx, 1);
      }
    },

    // 6. t = 58.5: Switch to NAIVE_EDGE
    {
      id: 'step_58_5_switch_strategy_edge',
      time: 58.5,
      executed: false,
      action(state) {
        highlightUI(['ctrl-onto-naive-edge']);
        state.ontology = 'NAIVE_EDGE';
      }
    },

    // 7. t = 61.0: Report Defect crack=2mm on Part_M01 (attached to mounted_in EDGE)
    {
      id: 'step_61_0_attach_crack_edge',
      time: 61.0,
      executed: false,
      action(state) {
        highlightUI(['biz-def-target', 'biz-def-btn']);
        state.currentTime = 61.0;
        const event = createReportDefectEvent('Part_M01', 'crack', '2mm', state.currentTime);
        if (event) state.eventLog.push(event);
      }
    },

    // 8. t = 78.0: Dismantle Part_M01
    {
      id: 'step_78_0_dismantle_part',
      time: 78.0,
      executed: false,
      action(state) {
        highlightUI(['biz-dism-part', 'biz-dism-btn']);
        state.currentTime = 78.0;
        const event = createDismantleEvent('Part_M01', state.currentTime);
        if (event) state.eventLog.push(event);
      }
    },

    // 9. t = 82.0: Register Warehouse_1
    {
      id: 'step_82_0_reg_warehouse',
      time: 82.0,
      executed: false,
      action(state) {
        highlightUI(['biz-reg-id', 'biz-reg-btn']);
        state.currentTime = 82.0;
        const event = createRegisterPartEvent('Warehouse_1', state.currentTime, 'Warehouse');
        if (event) state.eventLog.push(event);
      }
    },

    // 10. t = 84.0: Move Part_M01 to Warehouse_1
    {
      id: 'step_84_0_store_part',
      time: 84.0,
      executed: false,
      action(state) {
        highlightUI(['biz-store-part', 'biz-store-target', 'biz-store-btn']);
        state.currentTime = 84.0;
        const event = createAssembleEvent('Warehouse_1', 'Part_M01', 'stored_at', state.currentTime);
        if (event) state.eventLog.push(event);
      }
    },

    // 11. t = 122.0: Switch to ISO 15926 (4D) in Logical (SMIM) Perspective
    {
      id: 'step_122_0_switch_iso',
      time: 122.0,
      executed: false,
      action(state) {
        highlightUI(['ctrl-onto-iso', 'ctrl-view-logical']);
        state.ontology = 'ISO15926';
        setPerspective('SMIM');
      }
    }
  ]
};

/**
 * Dispatches pending timeline actions based on current playback time.
 */
export function onTimeUpdate(currentTime, state, renderGraph) {
  if (!Array.isArray(vanishingCrackScenario.timeline)) return;

  vanishingCrackScenario.timeline.forEach(step => {
    if (currentTime >= step.time && !step.executed) {
      step.executed = true;
      const fn = step.action || step.execute;
      if (typeof fn === 'function') {
        fn(state, renderGraph);
      }
      if (typeof renderGraph === 'function') {
        renderGraph();
      }
    }
  });
}

/**
 * Resets execution flags on timeline steps when seeking, stopping, or rewinding.
 */
export function resetTimeline(targetTime = 0) {
  if (!Array.isArray(vanishingCrackScenario.timeline)) return;
  vanishingCrackScenario.timeline.forEach(step => {
    if (step.time >= targetTime) {
      step.executed = false;
    }
  });
}