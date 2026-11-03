/**
 * SCENARIO: THE Q-D-I-K-W PIPELINE (ROLES, RULES & BLIND SPOTS)
 * -------------------------------------------------------------
 */

import { setPerspective, nextSequence } from '../state.js';
import {
  createRegisterPartEvent,
  createAssembleEvent,
  createReportDefectEvent,
  createDismantleEvent
} from '../smrm/actions.js';

let lastExecutedStep = -1;
let openSelectTimeouts = [];

export const QDIKW_STAGE_TIMESTAMPS = {
  INTRO: 0,
  Q: 62.00,
  D: 128.48,
  I: 189.40,
  K: 296.70,
  W: 393.67
};

export function clearQdikwHighlights() {
  document.querySelectorAll('.tour-pulse-highlight, .tour-amber-highlight').forEach(el => {
    el.classList.remove('tour-pulse-highlight', 'tour-amber-highlight');
  });
  openSelectTimeouts.forEach(t => clearTimeout(t));
  openSelectTimeouts = [];
  document.querySelectorAll('select[data-tour-opened="true"]').forEach(sel => {
    sel.removeAttribute('size');
    sel.removeAttribute('data-tour-opened');
  });
}

function highlightElements(selectors, styleClass = 'tour-pulse-highlight') {
  clearQdikwHighlights();
  if (!selectors) return;
  const list = Array.isArray(selectors) ? selectors : [selectors];
  list.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.classList.add(styleClass);
  });
}

/**
 * Visually expands a <select> dropdown on screen so viewers can see its options.
 */
function openDropdownTemporary(selector, durationMs = 6500) {
  const el = document.querySelector(selector);
  if (!el || el.tagName !== 'SELECT') return;
  const optionCount = Math.min(Math.max(el.options.length, 3), 6);
  el.setAttribute('size', String(optionCount));
  el.setAttribute('data-tour-opened', 'true');
  const timer = setTimeout(() => {
    el.removeAttribute('size');
    el.removeAttribute('data-tour-opened');
  }, durationMs);
  openSelectTimeouts.push(timer);
}

export const qdikwScenario = {
  id: 'QDIKW_PIPELINE',
  title: 'The Q-D-I-K-W Pipeline: Roles, Rules & Blind Spots',
  audioSrc: './narratives/General_QDIKW.mp3',
  fallbackDuration: 507,

  subtitles: [
    { start: 0.14, end: 3.54, text: "Welcome to the QDIKW demonstrator." },
    { start: 4.32, end: 9.06, text: "In consulting slides, the data, information, knowledge, wisdom pyramid is" },
    { start: 9.06, end: 10.60, text: "often presented like magic." },
    { start: 11.26, end: 15.54, text: "Pour raw data into a graph and executive wisdom comes out the other side." },
    { start: 16.36, end: 21.70, text: "That illusion makes it look as if a single all-knowing mega brain is doing all the work." },
    { start: 22.42, end: 25.92, text: "And if such a mega brain existed, we wouldn't need a knowledge management" },
    { start: 25.92, end: 26.68, text: "system at all." },
    { start: 27.40, end: 32.24, text: "In real systems engineering, there is no magic. There is only the law of" },
    { start: 32.24, end: 34.18, text: "conservation of engineering effort." },
    { start: 34.80, end: 37.96, text: "A knowledge system cannot invent physics out of thin air." },
    { start: 38.60, end: 41.40, text: "Its true power is separating human roles." },
    { start: 42.06, end: 47.26, text: "Today, various specialists already do this hard work, but their outputs are trapped" },
    { start: 47.26, end: 51.34, text: "in disconnected Word documents, CAD files, and Excel spreadsheets." },
    { start: 52.00, end: 56.94, text: "Let's walk through the five stages from question to wisdom and see not just what" },
    { start: 56.94, end: 61.28, text: "happens on screen, but who had to do what beforehand to make it work." },
    { start: 62.00, end: 63.86, text: "Stage one: the question." },
    { start: 65.92, end: 71.20, text: "A fleet operator asks a seemingly simple question. \"A crack was just reported on" },
    { start: 71.20, end: 76.10, text: "vehicle one. Is it safe to dispatch or is there a risk of structural failure?\"" },
    { start: 76.90, end: 79.28, text: "Here we hit the first expectation trap." },
    { start: 80.04, end: 83.32, text: "One may assume the system will magically spot any flaw." },
    { start: 84.04, end: 88.40, text: "In reality, the system can only answer questions if two people laid the" },
    { start: 88.40, end: 91.38, text: "groundwork long before vehicle one was even built." },
    { start: 92.26, end: 98.78, text: "First, the IT and database architect at the SMS and SMIM layers had to program the" },
    { start: 98.78, end: 104.20, text: "graph database to support temporal states, hierarchical paths, and rule execution." },
    { start: 106.58, end: 112.24, text: "Second, the ontology modeler at the SMRM layer had to define the controlled vocabulary," },
    { start: 112.84, end: 119.58, text: "creating explicit classes for vehicles, slots, parts, defects, load types, and hazards." },
    { start: 122.04, end: 126.34, text: "You cannot ask a question if the database lacks the grammar to express it." },
    { start: 128.48, end: 130.32, text: "Stage two: data." },
    { start: 132.82, end: 136.04, text: "A maintenance technician in the workshop inspects the vehicle." },
    { start: 137.02, end: 141.16, text: "Notice that the defect does not magically attach itself to a component." },
    { start: 142.06, end: 145.76, text: "The technician scans the barcode of a specific physical part," },
    { start: 146.36, end: 151.84, text: "serial number ARM_SN_404, and logs" },
    { start: 151.84, end: 157.74, text: "DEFECT_742, selecting crack and typing 15 millimeters." },
    { start: 160.38, end: 162.46, text: "Why is this still just raw data?" },
    { start: 163.12, end: 167.74, text: "Because the technician isn't typing freeform prose. They are constrained by" },
    { start: 167.74, end: 171.84, text: "the dropdown menus that the database programmer and ontologist built for them." },
    { start: 172.50, end: 177.30, text: "Yet, at this level, the record is just an isolated observation on a serial number." },
    { start: 177.88, end: 181.94, text: "The technician doesn't know fracture mechanics, and the raw log doesn't know" },
    { start: 181.94, end: 186.72, text: "what role ARM_SN_404 plays in the vehicle." },
    { start: 189.40, end: 194.30, text: "Stage three: information, giving data structural context." },
    { start: 196.46, end: 200.48, text: "This brings us to the most critical question in engineering data management." },
    { start: 201.20, end: 205.32, text: "How does the system know that this part is under dynamic cyclic loading?" },
    { start: 206.14, end: 211.28, text: "If we forced the 3D CAD designer who models a suspension arm in a CAD tool to" },
    { start: 211.28, end: 216.32, text: "manually fill in 40 ontological attributes about cyclic loads and vehicle-level" },
    { start: 216.32, end: 219.16, text: "hazards, the project would fail within a week." },
    { start: 219.88, end: 224.14, text: "Component designers shouldn't have to guess system-level physics, and a spare" },
    { start: 224.14, end: 229.50, text: "part sitting on a shelf in warehouse_1 experiences zero cyclic load anyway." },
    { start: 230.24, end: 235.24, text: "Instead, look at how IEC 63339 separates their work." },
    { start: 237.26, end: 244.22, text: "The 3D CAD designer simply registers ARM_SN_404 and places it" },
    { start: 244.22, end: 246.42, text: "into the assembly tree. Nothing more." },
    { start: 248.92, end: 254.42, text: "Meanwhile, the systems architect, or an automated import from a DFMEA safety" },
    { start: 254.42, end: 257.56, text: "table, defines the functional architecture once." },
    { start: 258.22, end: 264.68, text: "They mark the functional slot, SLOT_FRONT_SUSPENSION, as experiencing" },
    { start: 264.68, end: 270.20, text: "DYNAMIC_CYCLIC loading and serving the STEERING_CONTROL function." },
    { start: 272.92, end: 277.88, text: "The moment ARM_SN_404 is mounted into" },
    { start: 277.88, end: 284.60, text: "SLOT_FRONT_SUSPENSION, the graph automatically inherits that operational context." },
    { start: 285.26, end: 289.96, text: "The part now carries dynamic cyclic loading, not because someone hardcoded it" },
    { start: 289.96, end: 293.88, text: "onto the metal, but because of where it currently sits in the architecture." },
    { start: 296.70, end: 298.64, text: "Stage four: knowledge." },
    { start: 300.40, end: 305.32, text: "How does the system connect a 15-millimeter crack to a catastrophic failure?" },
    { start: 306.78, end: 310.02, text: "Here, a materials and fatigue specialist steps in." },
    { start: 310.82, end: 315.06, text: "This expert knows nothing about Cypher queries or RDF triples." },
    { start: 315.82, end: 320.04, text: "Working purely with the pre-approved building blocks in the domain dictionary," },
    { start: 320.04, end: 322.60, text: "they formulate modular atomic rules." },
    { start: 323.38, end: 325.88, text: "Rule one: context inheritance." },
    { start: 326.58, end: 331.86, text: "Any part mounted in a slot with DYNAMIC_CYCLIC regime is subject to" },
    { start: 331.86, end: 334.66, text: "ACTIVE_CYCLIC_STRESS." },
    { start: 336.06, end: 338.28, text: "Rule two: material physics." },
    { start: 339.04, end: 345.72, text: "A crack exceeding 10 millimeters on a part under ACTIVE_CYCLIC_STRESS triggers" },
    { start: 345.72, end: 348.74, text: "RAPID_FRACTURE_PROPAGATION." },
    { start: 350.54, end: 352.72, text: "Rule three: functional safety." },
    { start: 353.46, end: 360.24, text: "RAPID_FRACTURE_PROPAGATION in any slot supporting STEERING_CONTROL" },
    { start: 360.24, end: 361.64, text: "causes a system hazard," },
    { start: 362.32, end: 365.00, text: "LOSS_OF_CONTROL." },
    { start: 366.89, end: 367.95, text: "Notice the boundary." },
    { start: 368.57, end: 373.33, text: "The materials expert couldn't invent new database structures. They could only wire" },
    { start: 373.33, end: 377.55, text: "together concepts that the IT architect and ontologist made available." },
    { start: 378.29, end: 382.33, text: "Because the graph engine supports transitive inference, these three" },
    { start: 382.33, end: 387.37, text: "independent rules snap together like Lego bricks, automatically building a causal" },
    { start: 387.37, end: 391.27, text: "bridge from the technician's barcode scan to a vehicle-level failure." },
    { start: 393.67, end: 396.39, text: "Finally, stage five, wisdom." },
    { start: 397.13, end: 400.03, text: "Turning inferred knowledge into an actionable decision." },
    { start: 402.09, end: 406.93, text: "Traversing the causal chain, the system tells the fleet operator, \"Critical" },
    { start: 406.93, end: 411.95, text: "hazard. Loss of control risk for ground vehicle one. Generate work order for" },
    { start: 411.95, end: 413.45, text: "suspension arm replacement.\"" },
    { start: 415.67, end: 419.07, text: "But what happens when reality steps outside these rules?" },
    { start: 420.87, end: 422.85, text: "Let's test the system's blind spot." },
    { start: 423.59, end: 427.59, text: "Suppose the technician logs a second observation on the exact same part," },
    { start: 428.21, end: 434.43, text: "defect_743, surface_corrosion, five square centimeters." },
    { start: 435.37, end: 440.19, text: "Watch the graph. The corrosion record passes through data and attaches to the" },
    { start: 440.19, end: 445.41, text: "suspension slot as information, and then it stops. Why?" },
    { start: 446.09, end: 450.27, text: "Because the materials expert hasn't authored a rule linking surface corrosion" },
    { start: 450.27, end: 451.77, text: "area to cyclic fracture," },
    { start: 452.49, end: 456.41, text: "or perhaps the database lacks the mathematical operators to calculate" },
    { start: 456.41, end: 457.85, text: "cross-sectional rust loss." },
    { start: 458.67, end: 463.65, text: "Instead of hallucinating or silently hiding the problem, a properly architected" },
    { start: 463.65, end: 467.35, text: "system explicitly flags an unmapped engineering condition." },
    { start: 468.01, end: 470.73, text: "Automated inference stopped at the information layer." },
    { start: 471.35, end: 475.97, text: "Escalate defect_743 to a human materials specialist." },
    { start: 479.07, end: 483.69, text: "That is the real takeaway of this workbench. A knowledge graph is not a" },
    { start: 483.69, end: 489.17, text: "crystal ball. Without it, five specialists still do all this work in isolated" },
    { start: 489.17, end: 492.65, text: "documents, and it takes days of meetings to connect the dots." },
    { start: 493.33, end: 498.39, text: "With it, each role contributes their piece of the puzzle once within clear technical" },
    { start: 498.39, end: 503.13, text: "boundaries, allowing the system to connect those dots in milliseconds while" },
    { start: 503.13, end: 506.61, text: "honestly showing where human engineering judgment must take over." }
  ],

  timeline: [
    {
      // 00:00.00 - Seed initial baseline vehicle structure so Stage Q has context on screen
      time: 0,
      action: (state, renderGraph) => {
        state.eventLog.splice(0, state.eventLog.length);
        state.currentTime = 0;
        state.edgeSequence = 1;
        state.ontology = 'BFO';
        setPerspective('SMRM');
        state.graphEngine = 'MERMAID';
        state.showHistory = false;

        // Seed baseline Vehicle_1 & Warehouse_1 so database isn't empty on Stage Q
        state.eventLog.push(
          createRegisterPartEvent('Vehicle_1', 0, 'Vehicle', nextSequence()),
          createRegisterPartEvent('Powertrain_Unit', 0, 'Part', nextSequence()),
          createAssembleEvent('Vehicle_1', 'Powertrain_Unit', 'mounted_in', 0, nextSequence()),
          createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', nextSequence())
        );

        if (state.qdikw) {
          state.qdikw.active = true;
          state.qdikw.stage = 'INTRO';
          state.qdikw.activeRole = 'System Overview';
          state.qdikw.roleBadge = 'Law of Conservation of Engineering Effort';
          state.qdikw.questionText = '';
          state.qdikw.slotMetadata = {};
          state.qdikw.rules.rule1 = false;
          state.qdikw.rules.rule2 = false;
          state.qdikw.rules.rule3 = false;
        }
        if (state.figureOverlay) {
          state.figureOverlay.visible = false;
        }
        clearQdikwHighlights();
        renderGraph();
      }
    },
    {
      // 00:04.32 - Show DIKW Pyramid Fullscreen Figure Overlay
      time: 4.32,
      action: (state) => {
        if (state.figureOverlay) {
          state.figureOverlay.visible = true;
          state.figureOverlay.src = './figures/1280px-DIKW_Pyramid.svg.webp';
          state.figureOverlay.caption = 'The Classical DIKW Pyramid — Often presented as if raw data automatically turns into wisdom without human role separation.';
          state.figureOverlay.attributionHtml = '<a href="https://commons.wikimedia.org/wiki/File:DIKW_Pyramid.svg" target="_blank" rel="noopener">Longlivetheux</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noopener">CC BY-SA 4.0</a>, via Wikimedia Commons';
        }
      }
    },
    {
      // 00:27.40 - Hide Figure Overlay
      time: 27.40,
      action: (state) => {
        if (state.figureOverlay) {
          state.figureOverlay.visible = false;
        }
        highlightElements('#qdikw-stage-bar');
      }
    },
    {
      // 01:02.00 - STAGE 1: QUESTION
      time: 62.00,
      action: (state, renderGraph) => {
        if (state.figureOverlay) state.figureOverlay.visible = false;
        if (state.qdikw) {
          state.qdikw.stage = 'Q';
          state.qdikw.activeRole = 'Fleet Operator (Run-Time)';
          state.qdikw.roleBadge = 'Asks: "Is Vehicle_1 safe to dispatch?"';
        }
        highlightElements(['#qdikw-step-Q', '#query-content']);
        renderGraph();
      }
    },
    {
      // 01:32.26 - Role 1: IT & Database Architect
      time: 92.26,
      action: (state) => {
        if (state.qdikw) {
          state.qdikw.activeRole = 'IT & Database Architect (Design-Time)';
          state.qdikw.roleBadge = 'Programmed SMS/SMIM graph storage, temporal states & rule engine';
        }
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-logical', '#ctrl-view-physical-lpg', '#storage-content']);
      }
    },
    {
      // 01:46.58 - Role 2: Ontology Modeller (Expand Entity Class Dropdown!)
      time: 106.58,
      action: (state, renderGraph, ui) => {
        if (state.qdikw) {
          state.qdikw.activeRole = 'Ontology Modeller (Design-Time)';
          state.qdikw.roleBadge = 'Defined SMRM controlled vocabulary: Vehicle, Slot, Part, Defect, Load Types, Hazards';
        }
        if (ui) ui.bizRegType.value = 'Part';
        highlightElements(['#biz-reg-type', '#ctrl-view-smrm'], 'tour-amber-highlight');
        openDropdownTemporary('#biz-reg-type', 8000);
      }
    },
    {
      // 02:08.48 - STAGE 2: DATA (Field Technician)
      time: 128.48,
      action: (state, renderGraph) => {
        if (state.figureOverlay) state.figureOverlay.visible = false;
        // Isolate the canvas to show raw data logging clearly
        state.eventLog.splice(0, state.eventLog.length);
        state.eventLog.push(
          createRegisterPartEvent('Vehicle_1', 0, 'Vehicle', nextSequence()),
          createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', nextSequence())
        );
        if (state.qdikw) {
          state.qdikw.stage = 'D';
          state.qdikw.activeRole = 'Maintenance Technician (Run-Time)';
          state.qdikw.roleBadge = 'Scans barcode & logs structured observation via constrained UI';
        }
        highlightElements('#qdikw-step-D');
        renderGraph();
      }
    },
    {
      // 02:22.06 - Technician scans barcode ARM_SN_404
      time: 142.06,
      action: (state, renderGraph, ui) => {
        if (ui) {
          ui.bizRegType.value = 'Part';
          ui.bizRegId.value = 'ARM_SN_404';
        }
        state.eventLog.push(
          createRegisterPartEvent('ARM_SN_404', 0, 'Part', nextSequence())
        );
        highlightElements(['#biz-reg-id', '#biz-reg-btn']);
        renderGraph();
      }
    },
    {
      // 02:31.84 - Technician logs DEFECT_742 (crack = 15mm) on ARM_SN_404
      time: 151.84,
      action: (state, renderGraph, ui) => {
        if (ui) {
          ui.bizDefTarget.value = 'ARM_SN_404';
          ui.bizDefType.value = 'crack';
          ui.bizDefVal.value = '15mm';
        }
        state.eventLog.push(
          createReportDefectEvent('ARM_SN_404', 'crack', '15mm', 0, nextSequence())
        );
        highlightElements(['#biz-def-target', '#biz-def-type', '#biz-def-val', '#biz-def-btn'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // 02:43.12 - Show constrained dropdown menus visually expanded!
      time: 163.12,
      action: () => {
        highlightElements(['#biz-def-target', '#biz-reg-type'], 'tour-amber-highlight');
        openDropdownTemporary('#biz-def-target', 7000);
        openDropdownTemporary('#biz-reg-type', 7000);
      }
    },
    {
      // 03:09.40 - STAGE 3: INFORMATION (Structural Context)
      time: 189.40,
      action: (state) => {
        if (state.figureOverlay) state.figureOverlay.visible = false;
        if (state.qdikw) {
          state.qdikw.stage = 'I';
          state.qdikw.activeRole = '3D CAD Designer vs. Systems Architect';
          state.qdikw.roleBadge = 'Separating part geometry from slot functional physics (IEC 63339)';
        }
        highlightElements('#qdikw-step-I');
      }
    },
    {
      // 03:40.00 - Spare Part on shelf in Warehouse_1 (Zero cyclic load)
      time: 220.00,
      action: (state, renderGraph) => {
        state.eventLog.push(
          createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 0, nextSequence())
        );
        highlightElements(['#biz-store-part', '#biz-store-target', '#biz-store-btn']);
        renderGraph();
      }
    },
    {
      // 03:57.26 - 3D CAD Designer removes part from Warehouse and places into Vehicle_1 assembly
      time: 237.26,
      action: (state, renderGraph, ui) => {
        if (state.qdikw) {
          state.qdikw.activeRole = '3D CAD Designer (Design-Time)';
          state.qdikw.roleBadge = 'Places ARM_SN_404 into Vehicle_1 assembly — zero physics hardcoded on part';
        }
        // Remove from Warehouse_1 first so it doesn't stay in two places!
        state.eventLog.push(
          createDismantleEvent('ARM_SN_404', 0, nextSequence()),
          createAssembleEvent('Vehicle_1', 'ARM_SN_404', 'mounted_in', 0, nextSequence())
        );
        if (ui) {
          ui.bizInstSource.value = 'ARM_SN_404';
          ui.bizInstTarget.value = 'Vehicle_1';
        }
        highlightElements(['#biz-inst-source', '#biz-inst-target', '#biz-inst-btn', '#tree-container']);
        renderGraph();
      }
    },
    {
      // 04:18.22 - Systems Architect defines functional slot metadata (DYNAMIC_CYCLIC & STEERING_CONTROL)
      time: 258.22,
      action: (state, renderGraph) => {
        setPerspective('SMIM');
        if (state.qdikw) {
          state.qdikw.activeRole = 'Systems Architect / DFMEA Import (Design-Time)';
          state.qdikw.roleBadge = 'Marks functional slot with DYNAMIC_CYCLIC loading & STEERING_CONTROL';
          state.qdikw.slotMetadata = {
            SLOT_FRONT_SUSPENSION: {
              loadRegime: 'DYNAMIC_CYCLIC',
              safetyFunction: 'STEERING_CONTROL'
            }
          };
        }
        highlightElements(['#qdikw-slot-config', '#ctrl-view-logical'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // 04:56.70 - STAGE 4: KNOWLEDGE (Materials & Fatigue Specialist)
      time: 296.70,
      action: (state, renderGraph) => {
        if (state.figureOverlay) state.figureOverlay.visible = false;
        setPerspective('SMIM');
        if (state.qdikw) {
          state.qdikw.stage = 'K';
          state.qdikw.activeRole = 'Materials & Fatigue Specialist (Design-Time)';
          state.qdikw.roleBadge = 'Authors modular atomic rules using SMRM dictionary blocks';
        }
        highlightElements(['#qdikw-step-K', '#qdikw-rules-bar']);
        renderGraph();
      }
    },
    {
      // 05:23.38 - Rule 1: Context Inheritance -> ACTIVE_CYCLIC_STRESS
      time: 323.38,
      action: (state, renderGraph) => {
        if (state.qdikw) state.qdikw.rules.rule1 = true;
        highlightElements('#qdikw-rule-1', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // 05:36.06 - Rule 2: Material Physics -> RAPID_FRACTURE_PROPAGATION
      time: 336.06,
      action: (state, renderGraph) => {
        if (state.qdikw) state.qdikw.rules.rule2 = true;
        highlightElements('#qdikw-rule-2', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // 05:50.54 - Rule 3: Functional Safety -> LOSS_OF_CONTROL
      time: 350.54,
      action: (state, renderGraph) => {
        if (state.qdikw) state.qdikw.rules.rule3 = true;
        highlightElements('#qdikw-rule-3', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // 06:33.67 - STAGE 5: WISDOM (Actionable Directive projected on Graph + Sidebar)
      time: 393.67,
      action: (state, renderGraph) => {
        if (state.figureOverlay) state.figureOverlay.visible = false;
        if (state.qdikw) {
          state.qdikw.stage = 'W';
          state.qdikw.activeRole = 'Fleet Operator (Run-Time Decision)';
          state.qdikw.roleBadge = 'Receives prescriptive directive: GROUND VEHICLE_1';
        }
        highlightElements(['#qdikw-step-W', '#qdikw-wisdom-box'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // 07:03.59 - BLIND SPOT TEST: Technician logs Defect_743 (surface_corrosion = 5cm2)
      time: 423.59,
      action: (state, renderGraph, ui) => {
        if (state.qdikw) {
          state.qdikw.activeRole = 'Boundary Test: Unmapped Engineering Condition';
          state.qdikw.roleBadge = 'Logging surface_corrosion = 5cm2 -> Stops at Information Layer!';
        }
        if (ui) {
          ui.bizDefTarget.value = 'ARM_SN_404';
          ui.bizDefType.value = 'surface_corrosion';
          ui.bizDefVal.value = '5cm2';
        }
        state.eventLog.push(
          createReportDefectEvent('ARM_SN_404', 'surface_corrosion', '5cm2', 0, nextSequence())
        );
        highlightElements(['#biz-def-type', '#biz-def-val', '#biz-def-btn', '#qdikw-blindspot-box'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // 07:59.07 - Final Takeaway Overview
      time: 479.07,
      action: (state) => {
        if (state.qdikw) {
          state.qdikw.activeRole = 'IEC 63339 Knowledge Architecture';
          state.qdikw.roleBadge = 'Connecting 5 specialists in milliseconds while respecting human boundaries';
        }
        highlightElements('#qdikw-stage-bar');
      }
    }
  ]
};

export function resetQdikwTimeline() {
  lastExecutedStep = -1;
  clearQdikwHighlights();
}

export function onQdikwTimeUpdate(currentTime, state, renderGraph, uiRefs) {
  const steps = qdikwScenario.timeline;
  for (let i = 0; i < steps.length; i++) {
    if (currentTime >= steps[i].time && i > lastExecutedStep) {
      lastExecutedStep = i;
      steps[i].action(state, renderGraph, uiRefs);
    }
  }
}