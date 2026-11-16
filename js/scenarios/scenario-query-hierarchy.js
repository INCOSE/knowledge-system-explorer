/**
 * SCENARIO: QUERY COMPLEXITY & DEEP HIERARCHY BENCHMARK (IEC 63339)
 * -----------------------------------------------------------------
 * Full 10m46s narrative (120 synchronised subtitles, 5 interactive chapters)
 * demonstrating 4-level nested assemblies, dynamic query swelling, the W3C RDF
 * reification wall vs 4D transitive property paths, field cannibalisation
 * contagion tracing, and physical bilocation/clone audits.
 */

import { setPerspective, nextSequence } from '../state.js';
import {
  createRegisterPartEvent,
  createAssembleEvent,
  createReportDefectEvent,
  createDismantleEvent
} from '../smrm/actions.js';
import {
  highlightGraphNodes,
  clearMetaArchitectureHighlights
} from './scenario-meta-architecture.js';

let lastExecutedStep = -1;
let openSelectTimeouts = [];

export const QUERY_HIERARCHY_CHAPTERS = [
  { id: 'CH1_FLAT', label: '1. Flat Graph Illusion', time: 5.46 },
  { id: 'CH2_SWELL', label: '2. 4-Level Assembly Swell', time: 75.12 },
  { id: 'CH3_BOM', label: '3. Intent 1: Deep BOM', time: 144.98 },
  { id: 'CH4_CONTAGION', label: '4. Intent 2: Contagion Trace', time: 320.60 },
  { id: 'CH5_CLONE', label: '5. Intent 3: Clone Paradox', time: 511.02 }
];

export function clearQueryHierarchyHighlights() {
  clearMetaArchitectureHighlights();
  openSelectTimeouts.forEach(t => clearTimeout(t));
  openSelectTimeouts = [];
  if (typeof document !== 'undefined') {
    document.querySelectorAll('select[data-tour-opened="true"]').forEach(sel => {
      sel.removeAttribute('size');
      sel.removeAttribute('data-tour-opened');
    });
  }
}

function highlightElements(selectors, styleClass = 'tour-pulse-highlight') {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.tour-pulse-highlight, .tour-amber-highlight').forEach(el => {
    el.classList.remove('tour-pulse-highlight', 'tour-amber-highlight');
  });
  if (!selectors) return;
  const list = Array.isArray(selectors) ? selectors : [selectors];
  list.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.classList.add(styleClass);
  });
}

function openDropdownTemporary(selector, durationMs = 4500) {
  if (typeof document === 'undefined') return;
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

function seedDeepHierarchyAtT20(state) {
  state.eventLog.splice(0, state.eventLog.length);
  state.edgeSequence = 1;
  state.eventLog.push(
    createRegisterPartEvent('Unit_Alpha', 10, 'Vehicle', nextSequence()),
    createRegisterPartEvent('Unit_Beta', 10, 'Vehicle', nextSequence()),
    createRegisterPartEvent('Hub_Quarantine', 10, 'Warehouse', nextSequence()),
    createRegisterPartEvent('Sensor_Chip_404', 10, 'Part', nextSequence()),
    createRegisterPartEvent('Inverter_Sub_9', 10, 'Part', nextSequence()),
    createAssembleEvent('Inverter_Sub_9', 'Sensor_Chip_404', 'mounted_in', 10, nextSequence()),
    createRegisterPartEvent('Powerpack_M1', 10, 'Part', nextSequence()),
    createAssembleEvent('Powerpack_M1', 'Inverter_Sub_9', 'mounted_in', 10, nextSequence()),
    createAssembleEvent('Unit_Alpha', 'Powerpack_M1', 'mounted_in', 10, nextSequence())
  );
  state.currentTime = 20;
}

export const queryHierarchyScenario = {
  id: 'QUERY_HIERARCHY',
  title: '🔍 Query Complexity & Deep Hierarchy Benchmark: BOM, Contagion & Clone Paradox',
  audioSrc: './narratives/Queries_and_a_Complex_Assembly_-_IEC_63339.mp3',
  fallbackDuration: 647,
  chapters: QUERY_HIERARCHY_CHAPTERS,

  subtitles: [
    { start: 0.14, end: 3.86, text: "Welcome to the Query Complexity and Deep Hierarchy Benchmark." },
    { start: 5.46, end: 10.22, text: "Chapter one: The Flat Graph Illusion: Why Toy Examples Lie." },
    { start: 11.62, end: 16.72, text: "In our previous architectural matrix, we evaluated a simple single-level assembly," },
    { start: 17.28, end: 21.16, text: "one vehicle, one suspension slot, and one physical part." },
    { start: 22.30, end: 27.64, text: "When an hierarchy is only one level deep, almost any combination of upper ontology" },
    { start: 27.64, end: 31.94, text: "and graph database looks deceptively manageable in a vendor slide deck." },
    { start: 33.46, end: 38.46, text: "Whether you write Cypher in a labeled property graph or SPARQL in an RDF triple" },
    { start: 38.46, end: 43.68, text: "store, checking a single timestamp on a direct link takes only three lines of code." },
    { start: 45.20, end: 49.10, text: "However, real industrial systems are never one level deep." },
    { start: 50.46, end: 55.92, text: "An aircraft engine, a railway traction unit, or an autonomous vehicle is a nested" },
    { start: 55.92, end: 61.06, text: "Russian doll of subsystems, modules, sub-assemblies, and electronic components." },
    { start: 61.06, end: 67.14, text: "To see what actually happens to your database queries at scale, let us look at" },
    { start: 67.14, end: 71.36, text: "the database query panel in the bottom right corner and build a multi-level" },
    { start: 71.36, end: 73.26, text: "assembly live on the canvas." },
    { start: 75.12, end: 80.40, text: "Chapter two: Building a Deep Nested Assembly: Watching the Query Swell." },
    { start: 82.24, end: 84.72, text: "Let us start at time T equals 10." },
    { start: 86.06, end: 92.62, text: "We register two top-level operational units, Unit_Alpha and Unit_Beta," },
    { start: 92.62, end: 96.90, text: "alongside a quarantine facility, Hub_Quarantine." },
    { start: 98.36, end: 103.04, text: "Now, keep your eyes on the database query panel at the bottom right as we assemble" },
    { start: 103.04, end: 104.86, text: "our hierarchy from the bottom up." },
    { start: 106.20, end: 113.14, text: "First, we install a telemetry microchip, Sensor_Chip_404, into a power" },
    { start: 113.14, end: 117.56, text: "electronics sub-assembly, Inverter_Sub_9." },
    { start: 119.08, end: 127.16, text: "Next, we mount Inverter_Sub_9 into a heavy traction module, Powerpack_M1." },
    { start: 129.06, end: 135.76, text: "Finally, we install Powerpack_M1 into our top-level system, Unit_Alpha." },
    { start: 137.38, end: 141.50, text: "Look at what just happened to the query code in the bottom right panel as our tree" },
    { start: 141.50, end: 143.42, text: "reached three levels of depth." },
    { start: 144.98, end: 149.98, text: "Chapter three: Query Intent 1: Deep Temporal Bill of Materials." },
    { start: 151.40, end: 154.24, text: "Our first engineering question is seemingly basic:" },
    { start: 155.52, end: 162.18, text: "Give me the complete multi-level bill of materials for Unit_Alpha at time T equals 20." },
    { start: 164.34, end: 168.50, text: "Let us see how our two-by-two matrix handles recursion over time." },
    { start: 170.32, end: 176.06, text: "In a naive graph or a 3D BFO labeled property graph, physical parts are" },
    { start: 176.06, end: 179.16, text: "enduring nodes and timestamps live on the edges." },
    { start: 180.34, end: 184.72, text: "If you lack variable length path predicates, every additional level of the" },
    { start: 184.72, end: 189.76, text: "engineering tree forces the query generator to append another explicit match hop," },
    { start: 190.42, end: 196.80, text: "r1, r2, r3, and another temporal filter checking validFrom and validTo." },
    { start: 198.18, end: 202.26, text: "Even in modern Cypher, the engine cannot simply jump down the tree." },
    { start: 202.88, end: 208.34, text: "It must pause at every single relationship along the path and evaluate a temporal inequality." },
    { start: 210.14, end: 214.25, text: "Now, watch what happens when we keep BFO in 3D," },
    { start: 214.25, end: 218.70, text: "but switch the physical database to W3C RDF triples." },
    { start: 220.76, end: 224.08, text: "Look at the SPARQL query in the bottom right panel." },
    { start: 224.08, end: 226.84, text: "It has exploded into a massive wall of text." },
    { start: 228.62, end: 232.68, text: "Why can we not simply use a transitive SPARQL property path, like" },
    { start: 232.68, end: 237.08, text: "mounted_in*, to traverse down the assembly tree?" },
    { start: 238.42, end: 243.32, text: "Because in W3C RDF, binary predicates cannot hold timestamps." },
    { start: 244.78, end: 251.22, text: "Every mounting link in 3D BFO had to be reified into an artificial rdf:Statement node." },
    { start: 252.70, end: 257.62, text: "And in standard SPARQL, a recursive property path cannot stop mid-flight to" },
    { start: 257.62, end: 262.64, text: "inspect the literal validFrom and validTo timestamps hanging off intermediate" },
    { start: 262.64, end: 263.90, text: "reification nodes." },
    { start: 265.40, end: 272.18, text: "To query a four-level tree at time T in BFO plus RDF, you are forced to unroll the" },
    { start: 272.18, end: 277.12, text: "hierarchy into explicit multi-join blocks for every single depth level." },
    { start: 279.02, end: 282.20, text: "Now, keep your eyes on that giant SPARQL query" },
    { start: 282.20, end: 288.40, text: "as we switch the ontology from 3D BFO to 4D ISO 15926." },
    { start: 290.26, end: 291.04, text: "Look at that!" },
    { start: 292.12, end: 299.56, text: "The massive query instantly collapses into a clean three-line transitive expression. Why?" },
    { start: 300.76, end: 305.70, text: "Because in a 4D ontology, time is already baked into the state slices." },
    { start: 306.78, end: 311.34, text: "The structural links between active states are completely free of timestamps." },
    { start: 312.56, end: 318.04, text: "Whether your tree is three levels deep or 30 levels deep, the query remains identical." },
    { start: 320.60, end: 323.16, text: "Chapter four: Query Intent 2:" },
    { start: 323.78, end: 326.42, text: "Field Cannibalization and Contagion Tracing." },
    { start: 327.96, end: 331.64, text: "Now, let us make the engineering story much more dangerous." },
    { start: 333.26, end: 340.24, text: "At time T equals 30, Sensor_Chip_404 develops a critical defect," },
    { start: 340.68, end: 345.40, text: "thermal_drift of 12%, right at the bottom of our hierarchy." },
    { start: 346.96, end: 353.90, text: "At time T equals 50, Unit_Alpha is in the depot, and Unit_Beta needs an" },
    { start: 353.90, end: 354.88, text: "urgent deployment." },
    { start: 356.42, end: 360.50, text: "Maintenance technicians perform a field cannibalization, a hot swap." },
    { start: 361.92, end: 368.86, text: "They dismantle the entire traction module, Powerpack_M1, from Unit_Alpha and" },
    { start: 368.86, end: 371.72, text: "install it directly into Unit_Beta." },
    { start: 373.28, end: 375.64, text: "Notice a crucial detail in the database." },
    { start: 376.36, end: 380.10, text: "Nobody touched the inverter or the microchip inside the powerpack." },
    { start: 381.28, end: 384.22, text: "Their internal mounting timestamps never changed." },
    { start: 384.86, end: 388.40, text: "Only the top-level link between Powerpack_M1" },
    { start: 388.40, end: 391.34, text: "and the vehicle changed at T equals 50." },
    { start: 392.94, end: 399.60, text: "Finally, at time T equals 70, the faulty Sensor_Chip_404 is" },
    { start: 399.60, end: 404.40, text: "discovered, extracted from the inverter, and sent to Hub_Quarantine." },
    { start: 406.00, end: 410.62, text: "Now, let us select our second business question in the query intent dropdown." },
    { start: 412.12, end: 417.40, text: "Historical contagion trace. Find every top-level system that operated with this" },
    { start: 417.40, end: 420.20, text: "defective microchip while the defect was active." },
    { start: 422.06, end: 424.00, text: "Look at the query complexity now." },
    { start: 425.58, end: 430.90, text: "In 3D BFO, the database cannot simply look at the microchip's direct parent." },
    { start: 432.34, end: 437.98, text: "The microchip was never mounted directly into Unit_Alpha or Unit_Beta." },
    { start: 438.64, end: 443.28, text: "It was mounted in Inverter_Sub_9 the entire time." },
    { start: 444.66, end: 451.04, text: "To discover that both Unit_Alpha and Unit_Beta were exposed to the fault, the" },
    { start: 451.04, end: 455.26, text: "query engine must calculate the mathematical intersection of four separate" },
    { start: 455.26, end: 457.02, text: "time intervals simultaneously." },
    { start: 458.58, end: 463.58, text: "The defect interval, the chip-to-inverter interval, the inverter-to-powerpack" },
    { start: 463.58, end: 466.70, text: "interval, and the powerpack-to-vehicle intervals." },
    { start: 468.32, end: 471.04, text: "Look at the live query execution result table." },
    { start: 472.40, end: 479.10, text: "Both Unit_Alpha from T30 to T50 and Unit_Beta from" },
    { start: 479.10, end: 482.74, text: "T50 to T70 are flagged as contaminated." },
    { start: 484.42, end: 488.38, text: "When we switch to ISO 15926 in 4D," },
    { start: 489.06, end: 494.02, text: "notice why heavy regulated industries love this model despite its node explosion." },
    { start: 495.76, end: 500.40, text: "Because every configuration change sliced a new immutable state down the tree," },
    { start: 501.04, end: 506.68, text: "tracing historical exposure is a direct graph walk across state slices with zero" },
    { start: 506.68, end: 509.16, text: "interval overlap math required at query time." },
    { start: 511.02, end: 516.64, text: "Chapter five, query intent three: physical integrity and the clone paradox." },
    { start: 518.20, end: 522.36, text: "Finally, let us switch the query intent dropdown to our third test." },
    { start: 523.64, end: 528.32, text: "Physical integrity audit: detecting bilocation and cloned parts." },
    { start: 529.88, end: 535.40, text: "Suppose at time T equals 75, an automated supplier script registers" },
    { start: 535.40, end: 541.20, text: "Sensor_Chip_404 as installed in Unit_Beta," },
    { start: 541.82, end: 547.64, text: "but due to a software bug, fails to close its storage record in Hub_Quarantine." },
    { start: 549.26, end: 554.82, text: "In a schema-free naive LPG or an unconstrained property graph, the database" },
    { start: 554.82, end: 556.60, text: "happily accepts the transaction." },
    { start: 557.76, end: 562.50, text: "A single physical microchip with one serial number is now simultaneously" },
    { start: 562.50, end: 565.18, text: "sitting on a shelf in the quarantine warehouse" },
    { start: 565.18, end: 567.52, text: "and flying inside an operational vehicle." },
    { start: 568.92, end: 574.18, text: "To catch this in LPG, you must manually write and schedule defensive audit queries" },
    { start: 574.18, end: 577.68, text: "counting distinct active parent chains per serial number." },
    { start: 579.24, end: 585.56, text: "When we switch to our formal ontological views with W3C SHACL and SMRM semantic" },
    { start: 585.56, end: 590.38, text: "rules enabled, the architecture immediately triggers a boundary violation alert." },
    { start: 591.98, end: 597.86, text: "A single 3D material entity or a single 4D state slice at time T" },
    { start: 598.50, end: 602.20, text: "cannot occupy two disjoint spatial sites simultaneously." },
    { start: 604.14, end: 608.30, text: "Let us return to the engineer SMRM viewpoint to conclude." },
    { start: 610.10, end: 614.66, text: "By combining deep assemblies with live query intents, the trade-offs of our" },
    { start: 614.66, end: 617.06, text: "two-by-two matrix become crystal clear." },
    { start: 618.68, end: 623.68, text: "3D LPG gives you effortless developer onboarding and fast shallow queries." },
    { start: 625.08, end: 628.02, text: "3D RDF gives you global URI governance," },
    { start: 628.02, end: 632.30, text: "but punishes deep temporal recursion with reification joins." },
    { start: 633.72, end: 640.64, text: "While 4D ISO 15926 pays a heavy upfront price in state nodes so" },
    { start: 640.64, end: 644.92, text: "that deep historical audits and multi-level configuration queries remain" },
    { start: 644.92, end: 646.38, text: "mathematically effortless." }
  ],

  timeline: [
    // =========================================================================
    // CHAPTER 1: THE FLAT GRAPH ILLUSION (0.0s - 75.12s)
    // =========================================================================
    {
      time: 0.0,
      action: (state, renderGraph) => {
        clearQueryHierarchyHighlights();
        if (state.qdikw) state.qdikw.active = false;
        if (state.figureOverlay) state.figureOverlay.visible = false;
        state.queryIntent = 'DEEP_BOM';
        state.queryHighlight = '';
        state.eventLog.splice(0, state.eventLog.length);
        state.edgeSequence = 1;
        state.currentTime = 20;
        state.ontology = 'BFO';
        state.storage = 'LPG';
        setPerspective('SMIM');
        state.graphEngine = 'MERMAID';
        state.showHistory = true;

        // Simple 1-level toy assembly
        state.eventLog.push(
          createRegisterPartEvent('Vehicle_1', 10, 'Vehicle', nextSequence()),
          createRegisterPartEvent('ARM_SN_404', 10, 'Part', nextSequence()),
          createAssembleEvent('Vehicle_1', 'ARM_SN_404', 'mounted_in', 10, nextSequence())
        );
        renderGraph();
      }
    },
    {
      // "In our previous architectural matrix, we evaluated a simple single-level assembly..."
      time: 11.62,
      action: () => {
        highlightElements('#canvas-container');
        highlightGraphNodes(['Vehicle_1', 'Slot_Vehicle_1_ARM_SN_404', 'ARM_SN_404']);
      }
    },
    {
      // "When a hierarchy is only one level deep..."
      time: 22.30,
      action: (state) => {
        highlightGraphNodes([]);
        highlightElements(['#ctrl-onto-bfo', '#ctrl-onto-iso', '#ctrl-view-physical-lpg', '#ctrl-view-physical-rdf']);
      }
    },
    {
      // "Whether you write Cypher in a labeled property graph..."
      time: 33.46,
      action: (state, renderGraph) => {
        state.storage = 'LPG';
        state.queryHighlight = 'validFrom <= 20';
        highlightElements(['#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "...or SPARQL in an RDF triple store, checking a single timestamp takes only three lines of code."
      time: 37.50,
      action: (state, renderGraph) => {
        state.storage = 'RDF';
        state.queryHighlight = 'FILTER(?vf1 <= 20';
        highlightElements('#query-content', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "However, real industrial systems are never one level deep. An aircraft engine..."
      time: 45.20,
      action: (state, renderGraph) => {
        state.storage = 'LPG';
        state.queryHighlight = '';
        highlightElements('#tree-container', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "let us look at the database query panel in the bottom right corner and build a multi-level assembly live"
      time: 61.06,
      action: () => {
        highlightElements(['#query-content', '#query-intent-select'], 'tour-amber-highlight');
      }
    },

    // =========================================================================
    // CHAPTER 2: BUILDING A DEEP NESTED ASSEMBLY (75.12s - 144.98s)
    // =========================================================================
    {
      // "Chapter two: Building a Deep Nested Assembly: Watching the Query Swell."
      time: 75.12,
      action: (state, renderGraph) => {
        state.eventLog.splice(0, state.eventLog.length);
        state.currentTime = 10;
        state.ontology = 'BFO';
        state.storage = 'LPG';
        state.queryIntent = 'DEEP_BOM';
        state.queryHighlight = '';
        setPerspective('SMRM');
        highlightElements('#biz-time-badge', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "We register two top-level operational units, Unit_Alpha and Unit_Beta..."
      time: 86.06,
      action: (state, renderGraph, ui) => {
        if (ui) { ui.bizRegType.value = 'Vehicle'; ui.bizRegId.value = 'Unit_Alpha'; }
        state.eventLog.push(
          createRegisterPartEvent('Unit_Alpha', 10, 'Vehicle', nextSequence()),
          createRegisterPartEvent('Unit_Beta', 10, 'Vehicle', nextSequence())
        );
        highlightElements(['#biz-reg-type', '#biz-reg-id', '#biz-reg-btn'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Unit_Alpha', 'Unit_Beta']);
      }
    },
    {
      // "...alongside a quarantine facility, Hub_Quarantine."
      time: 92.62,
      action: (state, renderGraph, ui) => {
        if (ui) { ui.bizRegType.value = 'Warehouse'; ui.bizRegId.value = 'Hub_Quarantine'; }
        state.eventLog.push(
          createRegisterPartEvent('Hub_Quarantine', 10, 'Warehouse', nextSequence())
        );
        highlightElements(['#biz-reg-type', '#biz-reg-id', '#biz-reg-btn'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Hub_Quarantine']);
      }
    },
    {
      // "Now, keep your eyes on the database query panel at the bottom right..."
      time: 98.36,
      action: () => {
        highlightGraphNodes([]);
        highlightElements(['#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
      }
    },
    {
      // "First, we install a telemetry microchip, Sensor_Chip_404, into Inverter_Sub_9." (Depth = 1)
      time: 106.20,
      action: (state, renderGraph, ui) => {
        state.eventLog.push(
          createRegisterPartEvent('Sensor_Chip_404', 10, 'Part', nextSequence()),
          createRegisterPartEvent('Inverter_Sub_9', 10, 'Part', nextSequence())
        );
        if (ui) {
          ui.bizInstSource.value = 'Sensor_Chip_404';
          ui.bizInstTarget.value = 'Inverter_Sub_9';
        }
        highlightElements(['#biz-inst-source', '#biz-inst-target', '#biz-inst-btn'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      time: 112.50,
      action: (state, renderGraph) => {
        state.eventLog.push(
          createAssembleEvent('Inverter_Sub_9', 'Sensor_Chip_404', 'mounted_in', 10, nextSequence())
        );
        state.queryHighlight = 'r1:mounted_in';
        highlightElements(['#canvas-container', '#query-content'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Inverter_Sub_9', 'Sensor_Chip_404']);
      }
    },
    {
      // "Next, we mount Inverter_Sub_9 into a heavy traction module, Powerpack_M1." (Depth = 2 -> Query swells!)
      time: 119.08,
      action: (state, renderGraph, ui) => {
        state.eventLog.push(createRegisterPartEvent('Powerpack_M1', 10, 'Part', nextSequence()));
        if (ui) {
          ui.bizInstSource.value = 'Inverter_Sub_9';
          ui.bizInstTarget.value = 'Powerpack_M1';
        }
        highlightElements(['#biz-inst-source', '#biz-inst-target', '#biz-inst-btn'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      time: 123.50,
      action: (state, renderGraph) => {
        state.eventLog.push(
          createAssembleEvent('Powerpack_M1', 'Inverter_Sub_9', 'mounted_in', 10, nextSequence())
        );
        state.queryHighlight = 'r2:mounted_in';
        highlightElements(['#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Powerpack_M1', 'Inverter_Sub_9', 'Sensor_Chip_404']);
      }
    },
    {
      // "Finally, we install Powerpack_M1 into our top-level system, Unit_Alpha." (Depth = 3 -> Query swells again!)
      time: 129.06,
      action: (state, renderGraph, ui) => {
        if (ui) {
          ui.bizInstSource.value = 'Powerpack_M1';
          ui.bizInstTarget.value = 'Unit_Alpha';
        }
        highlightElements(['#biz-inst-source', '#biz-inst-target', '#biz-inst-btn'], 'tour-amber-highlight');
      }
    },
    {
      time: 132.50,
      action: (state, renderGraph) => {
        state.eventLog.push(
          createAssembleEvent('Unit_Alpha', 'Powerpack_M1', 'mounted_in', 10, nextSequence())
        );
        state.queryHighlight = 'r3:mounted_in';
        highlightElements(['#tree-container', '#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Unit_Alpha', 'Powerpack_M1', 'Inverter_Sub_9', 'Sensor_Chip_404']);
      }
    },
    {
      // "Look at what just happened to the query code in the bottom right panel as our tree reached three levels of depth."
      time: 137.38,
      action: (state) => {
        highlightGraphNodes([]);
        state.queryHighlight = 'Unrolled Depth = 3';
        highlightElements(['#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
      }
    },

    // =========================================================================
    // CHAPTER 3: QUERY INTENT 1 — DEEP TEMPORAL BOM (144.98s - 320.60s)
    // =========================================================================
    {
      time: 144.98,
      action: (state, renderGraph) => {
        seedDeepHierarchyAtT20(state);
        state.ontology = 'BFO';
        state.storage = 'LPG';
        state.queryIntent = 'DEEP_BOM';
        state.queryHighlight = '';
        setPerspective('SMIM');
        highlightElements(['#query-intent-select', '#biz-time-badge'], 'tour-amber-highlight');
        openDropdownTemporary('#query-intent-select', 4500);
        renderGraph();
      }
    },
    {
      // "In a naive graph or a 3D BFO labeled property graph, physical parts are enduring nodes..."
      time: 170.32,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        state.storage = 'LPG';
        setPerspective('SMS_LPG');
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-physical-lpg', '#canvas-container']);
        renderGraph();
      }
    },
    {
      // "...append another explicit match hop, r1, r2, r3, and another temporal filter checking validFrom and validTo."
      time: 184.72,
      action: (state) => {
        state.queryHighlight = 'r1.validFrom <= 20';
        highlightElements(['#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
      }
    },
    {
      time: 190.42,
      action: (state) => {
        state.queryHighlight = 'r3.validFrom <= 20';
        highlightElements('#query-content', 'tour-amber-highlight');
      }
    },
    {
      // "Now, watch what happens when we keep BFO in 3D, but switch the physical database to W3C RDF triples."
      time: 210.14,
      action: () => {
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-physical-rdf'], 'tour-amber-highlight');
      }
    },
    {
      time: 214.25,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        state.storage = 'RDF';
        state.queryHighlight = 'rdf:Statement';
        setPerspective('SMS_RDF');
        highlightElements(['#ctrl-view-physical-rdf', '#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Why can we not simply use a transitive SPARQL property path, like mounted_in*, to traverse down the assembly tree?"
      time: 228.62,
      action: (state) => {
        state.queryHighlight = 'mounted_in*';
        highlightElements('#query-content', 'tour-amber-highlight');
      }
    },
    {
      // "Every mounting link in 3D BFO had to be reified into an artificial rdf:Statement node."
      time: 244.78,
      action: (state) => {
        state.queryHighlight = '?stmt_1 a rdf:Statement';
        highlightElements(['#canvas-container', '#storage-content'], 'tour-amber-highlight');
      }
    },
    {
      // "To query a four-level tree at time T in BFO plus RDF, you are forced to unroll the hierarchy into explicit multi-join blocks"
      time: 265.40,
      action: (state) => {
        state.queryHighlight = 'Depth Level 3';
        highlightElements(['#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
      }
    },
    {
      // "Now, keep your eyes on that giant SPARQL query as we switch the ontology from 3D BFO to 4D ISO 15926."
      time: 279.02,
      action: () => {
        highlightElements(['#query-content', '#ctrl-onto-iso'], 'tour-amber-highlight');
      }
    },
    {
      time: 284.50,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        state.storage = 'RDF';
        state.queryHighlight = '(iso:mountedIn|iso:hasSlot|iso:storedAt)+';
        setPerspective('SMS_RDF');
        highlightElements(['#ctrl-onto-iso', '#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Because in a 4D ontology, time is already baked into the state slices."
      time: 300.76,
      action: (state, renderGraph) => {
        setPerspective('SMIM');
        highlightElements('#canvas-container');
        renderGraph();
        highlightGraphNodes(['4d_Unit_Alpha', '4d_Powerpack_M1', '4d_Inverter_Sub_9', '4d_Sensor_Chip_404']);
      }
    },

    // =========================================================================
    // CHAPTER 4: QUERY INTENT 2 — CANNIBALISATION & CONTAGION (320.60s - 511.02s)
    // =========================================================================
    {
      time: 320.60,
      action: (state, renderGraph) => {
        seedDeepHierarchyAtT20(state);
        state.ontology = 'BFO';
        state.storage = 'LPG';
        state.queryIntent = 'DEEP_BOM';
        state.queryHighlight = '';
        setPerspective('SMRM');
        highlightGraphNodes([]);
        highlightElements('#canvas-container');
        renderGraph();
      }
    },
    {
      // "At time T equals 30, Sensor_Chip_404 develops a critical defect, thermal_drift of 12%..."
      time: 333.26,
      action: (state, renderGraph, ui) => {
        state.currentTime = 30;
        if (ui) {
          ui.bizDefTarget.value = 'Sensor_Chip_404';
          ui.bizDefType.value = 'thermal_drift';
          ui.bizDefVal.value = '12%';
        }
        highlightElements(['#biz-time-badge', '#biz-def-target', '#biz-def-type', '#biz-def-val', '#biz-def-btn'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      time: 339.00,
      action: (state, renderGraph) => {
        state.eventLog.push(
          createReportDefectEvent('Sensor_Chip_404', 'thermal_drift', '12%', 30, nextSequence())
        );
        renderGraph();
        highlightGraphNodes(['Sensor_Chip_404', 'qual_Sensor_Chip_404_thermal_drift']);
      }
    },
    {
      // "At time T equals 50, Unit_Alpha is in the depot, and Unit_Beta needs an urgent deployment."
      time: 346.96,
      action: (state, renderGraph) => {
        state.currentTime = 50;
        highlightElements('#biz-time-badge', 'tour-amber-highlight');
        highlightGraphNodes(['Unit_Alpha', 'Unit_Beta']);
        renderGraph();
      }
    },
    {
      // "They dismantle the entire traction module, Powerpack_M1, from Unit_Alpha and install it directly into Unit_Beta."
      time: 361.92,
      action: (state, renderGraph, ui) => {
        if (ui) ui.bizDismPart.value = 'Powerpack_M1';
        state.eventLog.push(createDismantleEvent('Powerpack_M1', 50, nextSequence()));
        highlightElements(['#biz-dism-part', '#biz-dism-btn'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      time: 367.50,
      action: (state, renderGraph, ui) => {
        if (ui) {
          ui.bizInstSource.value = 'Powerpack_M1';
          ui.bizInstTarget.value = 'Unit_Beta';
        }
        state.eventLog.push(
          createAssembleEvent('Unit_Beta', 'Powerpack_M1', 'mounted_in', 50, nextSequence())
        );
        highlightElements(['#biz-inst-source', '#biz-inst-target', '#biz-inst-btn', '#tree-container'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Unit_Beta', 'Powerpack_M1', 'Inverter_Sub_9', 'Sensor_Chip_404']);
      }
    },
    {
      // "Notice a crucial detail in the database. Nobody touched the inverter or the microchip inside the powerpack."
      time: 373.28,
      action: (state, renderGraph) => {
        setPerspective('SMIM');
        highlightElements('#storage-content', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Inverter_Sub_9', 'Sensor_Chip_404']);
      }
    },
    {
      // "Finally, at time T equals 70, the faulty Sensor_Chip_404 is discovered, extracted from the inverter, and sent to Hub_Quarantine."
      time: 392.94,
      action: (state, renderGraph, ui) => {
        state.currentTime = 70;
        if (ui) {
          ui.bizStorePart.value = 'Sensor_Chip_404';
          ui.bizStoreTarget.value = 'Hub_Quarantine';
        }
        state.eventLog.push(
          createDismantleEvent('Sensor_Chip_404', 70, nextSequence()),
          createAssembleEvent('Hub_Quarantine', 'Sensor_Chip_404', 'stored_at', 70, nextSequence())
        );
        highlightElements(['#biz-time-badge', '#biz-store-part', '#biz-store-target', '#biz-store-btn'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Hub_Quarantine', 'Sensor_Chip_404']);
      }
    },
    {
      // "Now, let us select our second business question in the query intent dropdown: Historical contagion trace."
      time: 406.00,
      action: (state, renderGraph) => {
        highlightGraphNodes([]);
        state.queryIntent = 'CONTAGION';
        highlightElements('#query-intent-select', 'tour-amber-highlight');
        openDropdownTemporary('#query-intent-select', 5000);
        renderGraph();
      }
    },
    {
      // "Look at the query complexity now. In 3D BFO, the database cannot simply look at the microchip's direct parent."
      time: 422.06,
      action: (state) => {
        state.queryHighlight = 'apoc.coll.max';
        highlightElements(['#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
      }
    },
    {
      // "the query engine must calculate the mathematical intersection of four separate time intervals simultaneously."
      time: 444.66,
      action: (state, renderGraph) => {
        state.storage = 'RDF';
        state.queryHighlight = 'FILTER(?overlapStart < ?overlapEnd)';
        highlightElements('#query-content', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Look at the live query execution result table. Both Unit_Alpha from T30 to T50 and Unit_Beta from T50 to T70 are flagged as contaminated."
      time: 468.32,
      action: (state, renderGraph) => {
        state.storage = 'LPG';
        state.queryHighlight = '';
        highlightElements('.query-result-box', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "When we switch to ISO 15926 in 4D, notice why heavy regulated industries love this model..."
      time: 484.42,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        state.queryHighlight = '[:mounted_in|has_slot*1..8]';
        setPerspective('SMIM');
        highlightElements(['#ctrl-onto-iso', '#query-content', '#query-metrics-bar'], 'tour-amber-highlight');
        renderGraph();
      }
    },

    // =========================================================================
    // CHAPTER 5: QUERY INTENT 3 — CLONE PARADOX & BILOCATION (511.02s - 646.38s)
    // =========================================================================
    {
      time: 511.02,
      action: (state, renderGraph) => {
        state.ontology = 'NAIVE_NODE';
        state.storage = 'LPG';
        state.queryHighlight = '';
        setPerspective('SMRM');
        highlightElements('#query-intent-select', 'tour-amber-highlight');
        openDropdownTemporary('#query-intent-select', 4500);
        renderGraph();
      }
    },
    {
      // "Physical integrity audit: detecting bilocation and cloned parts."
      time: 523.64,
      action: (state, renderGraph) => {
        state.queryIntent = 'CLONE_AUDIT';
        state.queryHighlight = 'WHERE locCount > 1';
        highlightElements(['#query-intent-select', '#query-content'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Suppose at time T equals 75, an automated supplier script registers Sensor_Chip_404 as installed in Unit_Beta, but fails to close its storage record in Hub_Quarantine."
      time: 529.88,
      action: (state, renderGraph) => {
        state.currentTime = 75;
        // Intentionally push ASSEMBLE without DISMANTLE to simulate the supplier bilocation bug!
        state.eventLog.push(
          createAssembleEvent('Unit_Beta', 'Sensor_Chip_404', 'mounted_in', 75, nextSequence())
        );
        highlightElements(['#biz-time-badge', '#canvas-container', '.query-result-box'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Sensor_Chip_404', 'Hub_Quarantine', 'Unit_Beta']);
      }
    },
    {
      // "To catch this in LPG, you must manually write and schedule defensive audit queries counting distinct active parent chains..."
      time: 568.92,
      action: (state) => {
        state.queryHighlight = 'count(DISTINCT loc) AS locCount';
        highlightElements(['#query-content', '.query-result-box'], 'tour-amber-highlight');
      }
    },
    {
      // "When we switch to our formal ontological views with W3C SHACL and SMRM semantic rules enabled, the architecture immediately triggers a boundary violation alert."
      time: 579.24,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        state.storage = 'RDF';
        state.queryHighlight = 'HAVING (COUNT(DISTINCT ?site) > 1)';
        setPerspective('SMIM');
        highlightElements(['#ctrl-onto-bfo', '#query-content', '.query-result-box'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Let us return to the engineer SMRM viewpoint to conclude."
      time: 604.14,
      action: (state, renderGraph) => {
        state.queryHighlight = '';
        setPerspective('SMRM');
        highlightGraphNodes([]);
        highlightElements(['#ctrl-view-smrm', '#canvas-container'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "3D LPG gives you effortless developer onboarding and fast shallow queries."
      time: 618.68,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        state.storage = 'LPG';
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-physical-lpg']);
        renderGraph();
      }
    },
    {
      // "3D RDF gives you global URI governance, but punishes deep temporal recursion with reification joins."
      time: 625.08,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        state.storage = 'RDF';
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-physical-rdf']);
        renderGraph();
      }
    },
    {
      // "While 4D ISO 15926 pays a heavy upfront price in state nodes so that deep historical audits and multi-level configuration queries remain mathematically effortless."
      time: 633.72,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        state.storage = 'RDF';
        highlightElements(['#ctrl-onto-iso', '#query-content'], 'tour-amber-highlight');
        renderGraph();
      }
    }
  ]
};

export function resetQueryHierarchyTimeline() {
  lastExecutedStep = -1;
  clearQueryHierarchyHighlights();
}

export function onQueryHierarchyTimeUpdate(currentTime, state, renderGraph, uiRefs) {
  const steps = queryHierarchyScenario.timeline;
  for (let i = 0; i < steps.length; i++) {
    if (currentTime >= steps[i].time && i > lastExecutedStep) {
      lastExecutedStep = i;
      steps[i].action(state, renderGraph, uiRefs);
    }
  }
}