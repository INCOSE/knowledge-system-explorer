/**
 * SCENARIO: THE IEC 63339 4-LAYER META-MODEL ARCHITECTURE
 * -------------------------------------------------------
 * Full 14m26s narrative (149 synchronised subtitles, 6 interactive chapters)
 * operationalising the 4-layer meta-model (URMSM, SMRM, SMIM, SMS), dynamic
 * scope pruning (Slide 15), configuration element rules (Slide 16), and
 * ontological firewall decoupling (Slide 17) with live SVG node highlighting.
 */

import { setPerspective, nextSequence } from '../state.js';
import {
  createRegisterPartEvent,
  createAssembleEvent,
  createReportDefectEvent,
  createRevokeDefectEvent,
  createDismantleEvent
} from '../smrm/actions.js';

let lastExecutedStep = -1;
let openSelectTimeouts = [];
let activeGraphNodeIds = [];
let svgObserver = null;

export const META_ARCHITECTURE_CHAPTERS = [
  { id: 'CH1_FOREST', label: '1. Lost in the Forest', time: 5.36 },
  { id: 'CH2_ELEVATOR', label: '2. 4-Storey Elevator', time: 131.18 },
  { id: 'CH3_SCOPE', label: '3. Formalising Scope', time: 338.54 },
  { id: 'CH4_RED_ARROWS', label: '4. Red Config Arrows', time: 526.46 },
  { id: 'CH5_FIREWALL', label: '5. Ontology Firewall', time: 654.96 },
  { id: 'CH6_CLOSING', label: '6. Engineer Viewpoint', time: 788.54 }
];

function applySvgNodeHighlights() {
  if (typeof document === 'undefined') return;
  const svg = document.querySelector('#mermaid-container svg');
  if (!svg) return;

  svg.querySelectorAll('.graph-node-highlight').forEach(el => {
    el.classList.remove('graph-node-highlight');
  });

  if (!activeGraphNodeIds || activeGraphNodeIds.length === 0) {
    svg.classList.remove('svg-has-node-focus');
    return;
  }

  let matchedCount = 0;
  const allNodes = svg.querySelectorAll('g.node');
  allNodes.forEach(g => {
    const rawId = g.id || '';
    const isMatch = activeGraphNodeIds.some(targetId => {
      const safe = String(targetId).replace(/[^a-zA-Z0-9_]/g, '_');
      return (
        rawId === safe ||
        rawId.startsWith(`flowchart-${safe}-`) ||
        rawId.includes(`-${safe}-`) ||
        rawId.endsWith(`-${safe}`)
      );
    });
    if (isMatch) {
      g.classList.add('graph-node-highlight');
      matchedCount++;
    }
  });

  if (matchedCount > 0) {
    svg.classList.add('svg-has-node-focus');
  } else {
    svg.classList.remove('svg-has-node-focus');
  }
}

function ensureSvgObserver() {
  if (typeof document === 'undefined' || svgObserver) return;
  const container = document.getElementById('mermaid-container');
  if (!container) return;
  svgObserver = new MutationObserver(() => {
    if (activeGraphNodeIds.length > 0) {
      applySvgNodeHighlights();
    }
  });
  svgObserver.observe(container, { childList: true });
}

export function highlightGraphNodes(nodeIds = []) {
  activeGraphNodeIds = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
  ensureSvgObserver();
  applySvgNodeHighlights();
  setTimeout(applySvgNodeHighlights, 120);
  setTimeout(applySvgNodeHighlights, 350);
}

export function clearMetaArchitectureHighlights() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.tour-pulse-highlight, .tour-amber-highlight').forEach(el => {
    el.classList.remove('tour-pulse-highlight', 'tour-amber-highlight');
  });
  openSelectTimeouts.forEach(t => clearTimeout(t));
  openSelectTimeouts = [];
  document.querySelectorAll('select[data-tour-opened="true"]').forEach(sel => {
    sel.removeAttribute('size');
    sel.removeAttribute('data-tour-opened');
  });
  highlightGraphNodes([]);
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

function openDropdownTemporary(selector, durationMs = 6000) {
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

function seedBaselineHistory(state) {
  state.eventLog.splice(0, state.eventLog.length);
  state.edgeSequence = 1;
  const def2mmId = 'def_arm404_2mm';
  state.eventLog.push(
    createRegisterPartEvent('Vehicle_1', 0, 'Vehicle', nextSequence()),
    createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', nextSequence()),
    createRegisterPartEvent('ARM_SN_404', 10, 'Part', nextSequence()),
    createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 10, nextSequence()),
    createDismantleEvent('ARM_SN_404', 20, nextSequence()),
    createAssembleEvent('Vehicle_1', 'ARM_SN_404', 'mounted_in', 20, nextSequence()),
    createReportDefectEvent('ARM_SN_404', 'crack', '2mm', 50, def2mmId),
    createRevokeDefectEvent('ARM_SN_404', 'crack', 80, def2mmId, nextSequence()),
    createReportDefectEvent('ARM_SN_404', 'crack_critical', '15mm', 80, nextSequence())
  );
  state.currentTime = 80;
}

export const metaArchitectureScenario = {
  id: 'META_ARCHITECTURE',
  title: '📐 Meta-Level Architecture: Riding the 4-Storey Elevator of IEC 63339',
  audioSrc: './narratives/IEC_63339_-_Meta-Level.mp3',
  fallbackDuration: 866,
  chapters: META_ARCHITECTURE_CHAPTERS,

  subtitles: [
    { start: 0.12, end: 3.00, text: "Welcome to the Meta-Model Architecture Demonstrator." },
    { start: 5.36, end: 10.66, text: "Chapter 1: Lost in the Forest — Why Instance Graphs Are Not Enough." },
    { start: 13.90, end: 16.059, text: "Look at the graph currently on our canvas." },
    { start: 18.32, end: 23.30, text: "In our previous scenarios, we tracked a physical suspension arm, serial number" },
    { start: 23.30, end: 29.36, text: "ARM_SN_404, across its operational lifecycle." },
    { start: 30.92, end: 36.98, text: "We watched it move from a warehouse into a vehicle slot, develop a crack, and return to storage." },
    { start: 39.56, end: 44.56, text: "For a database programmer or a field engineer, this instance graph is fascinating." },
    { start: 46.68, end: 50.302, text: "Wait long enough, however, and a real automotive programme" },
    { start: 50.302, end: 52.42, text: "will not have 10 nodes on this screen." },
    { start: 54.58, end: 59.68, text: "It will have 10 million nodes, spanning mechanical parts, electronic control" },
    { start: 59.68, end: 62.80, text: "units, software allocations, and safety hazards." },
    { start: 65.68, end: 68.272, text: "As Robert Nilsson observes in his paper," },
    { start: 68.272, end: 71.38, text: "\"The Knowledge System: Is It One Ring to Rule Them All?\"" },
    { start: 72.00, end: 76.26, text: "Engineers quickly hit a wall where they cannot see the forest for all the trees." },
    { start: 78.64, end: 83.68, text: "Worse still, enterprise architects are forced to ask two uncomfortable questions." },
    { start: 83.68, end: 90.00, text: "First, is it even relevant to talk about a single forest at all?" },
    { start: 92.16, end: 96.66, text: "And second, are there different kinds of forests depending on who is looking?" },
    { start: 99.90, end: 105.10, text: "To answer those questions, we must step into the architectural elevator and ride" },
    { start: 105.10, end: 107.40, text: "up from the factory floor to the meta-level." },
    { start: 109.82, end: 116.14, text: "Watch the canvas as we switch our perspective to the IEC 63339 Meta-Model view." },
    { start: 119.30, end: 124.14, text: "Instead of looking only at individual nuts and bolts, we are now looking at a" },
    { start: 124.14, end: 127.86, text: "four-storey architectural building inside a single graph." },
    { start: 131.18, end: 137.06, text: "Chapter 2: Riding the Four-Storey Elevator of IEC 63339." },
    { start: 140.14, end: 142.939, text: "Let us walk through the four floors of this building" },
    { start: 142.939, end: 145.14, text: "using the colour legend on the bottom left." },
    { start: 147.42, end: 154.40, text: "The top floor is represented by the bright cyan boxes: the URMSM layer, or Unified" },
    { start: 154.40, end: 156.62, text: "Reference Model for Smart Manufacturing." },
    { start: 159.16, end: 161.80, text: "This is where organisational thinking begins." },
    { start: 164.04, end: 166.98, text: "Notice the three high-level Dimensions on the canvas:" },
    { start: 167.62, end: 172.04, text: "Product Development, Manufacturing, and Standardised Approach." },
    { start: 174.48, end: 179.66, text: "Each Dimension is broken down into concrete Aspects—or stakeholder viewpoints" },
    { start: 179.66, end: 186.34, text: "as defined in ISO 42010—such as Bill of Materials, Concept and" },
    { start: 186.34, end: 189.60, text: "Functional Context, and Top-Level Ontology." },
    { start: 192.00, end: 197.10, text: "An Aspect does not store car parts. It defines what a specific engineering" },
    { start: 197.10, end: 198.98, text: "department actually cares about." },
    { start: 201.92, end: 204.158, text: "Now, follow the aggregation arrows" },
    { start: 204.158, end: 207.92, text: "from those cyan Aspects to the next floor: the grey boxes." },
    { start: 210.30, end: 215.10, text: "This is the SMRM layer—the Smart Manufacturing Reference Model." },
    { start: 217.68, end: 224.14, text: "Here live our canonical domain Concepts: System, Physical Part, Functional Slot," },
    { start: 224.14, end: 226.10, text: "and Product Configuration Element." },
    { start: 228.58, end: 233.76, text: "Think of these grey boxes as your enterprise SysML or UML concept dictionary." },
    { start: 235.96, end: 240.78, text: "This is where human engineers across different departments agree on what words mean." },
    { start: 244.00, end: 250.14, text: "Next, follow the specialisation arrows to the third floor: the white boxes with dark borders." },
    { start: 252.82, end: 257.959, text: "This is the SMIM layer—the Smart Manufacturing Implementation Model." },
    { start: 260.44, end: 265.32, text: "A grey concept like System or Part is not yet a database rule." },
    { start: 267.62, end: 273.42, text: "At the SMIM layer, we commit to formal ontological classes and constraints, here" },
    { start: 273.42, end: 281.14, text: "shown as BFO three-dimensional continuants: :MaterialEntity, :BFO_Site, and :Quality." },
    { start: 284.04, end: 288.14, text: "Finally, follow the dashed instantiation lines to the ground floor:" },
    { start: 288.74, end: 291.78, text: "the SMS layer, or real data in the tool." },
    { start: 294.20, end: 302.24, text: "Look at Vehicle_1, ARM_SN_404, and its recorded cracks." },
    { start: 304.66, end: 309.64, text: "In fact, watch what happens if we use the engineer's toolbar right now to register" },
    { start: 309.64, end: 317.00, text: "a new component, ECU_Module_7, and install it into Vehicle_1." },
    { start: 319.82, end: 324.64, text: "The new instance immediately appears on the canvas and wires itself to :MaterialEntity" },
    { start: 324.64, end: 327.30, text: "via a dashed instantiation link." },
    { start: 329.64, end: 334.78, text: "Abstract theory at the top is directly connected to live engineering data at the bottom." },
    { start: 338.54, end: 344.10, text: "Chapter 3: Formalising Scope — Model What You Need, Not What You Can." },
    { start: 347.40, end: 352.54, text: "Now, let us use this four-layer machine to solve the first major dilemma highlighted" },
    { start: 352.54, end: 354.86, text: "in the paper that inspired this demonstrator:" },
    { start: 355.52, end: 359.22, text: "How do we stop ontologists from over-engineering the metamodel?" },
    { start: 362.088, end: 364.908, text: "In systems engineering, there is a golden rule:" },
    { start: 365.568, end: 368.168, text: "model what you need, not what you can." },
    { start: 371.068, end: 375.728, text: "Every grey Concept box we add to our repository increases the number of rules" },
    { start: 375.728, end: 377.728, text: "we must maintain across the enterprise." },
    { start: 380.108, end: 387.948, text: "Look at the grey box labelled Concept: Functional Object / Slot (ISO 81346)." },
    { start: 390.688, end: 393.328, text: "Why does our database have functional slots at all?" },
    { start: 395.548, end: 400.888, text: "Because the cyan Aspect—Concept & Functional Context—is currently active in" },
    { start: 400.888, end: 404.388, text: "our toolbar, explicitly demanding that concept." },
    { start: 407.288, end: 411.62, text: "Watch what happens when an organisation decides that for a simpler project," },
    { start: 411.62, end: 414.117, text: "they do not need functional slot analysis." },
    { start: 414.117, end: 417.548, text: "They only care about which physical part is in which vehicle." },
    { start: 419.888, end: 424.728, text: "Let us uncheck the Functional Context aspect toggle in the Meta-Model toolbar." },
    { start: 427.988, end: 429.568, text: "Look closely at the canvas." },
    { start: 430.228, end: 433.808, text: "Three things happen simultaneously across all four floors:" },
    { start: 436.468, end: 441.047, text: "First, at the grey SMRM layer, the Functional Slot concept" },
    { start: 441.047, end: 444.029, text: "vanishes completely, and the aspect links via" },
    { start: 444.029, end: 447.348, text: "a direct scope arrow straight to the System concept." },
    { start: 450.488, end: 452.986, text: "Second, at the white SMIM layer," },
    { start: 452.986, end: 457.148, text: ":BFO_Site is disconnected from the domain concept model." },
    { start: 459.748, end: 465.288, text: "And third—most importantly—look at the live instance data on the canvas and in" },
    { start: 465.288, end: 466.888, text: "the Node Store table on the right!" },
    { start: 469.188, end: 477.188, text: "The instance node Slot_Vehicle_1_ARM_SN_404" },
    { start: 477.188, end: 479.968, text: "has been completely pruned from the database." },
    { start: 482.468, end: 485.488, text: "The Node Store drops from six nodes down to five." },
    { start: 488.748, end: 492.287, text: "Even if we switch to the Logical SMIM view for a moment," },
    { start: 492.888, end: 499.868, text: "we see that Vehicle_1 and ARM_SN_404 now connect" },
    { start: 499.868, end: 502.408, text: "directly without an intermediate slot." },
    { start: 505.288, end: 509.748, text: "By tracing concepts strictly to stakeholder Aspects, the architecture" },
    { start: 509.748, end: 514.648, text: "proves mathematically which concepts are necessary and which ones are dead weight." },
    { start: 517.088, end: 519.335, text: "Let us return to the Meta-Model view" },
    { start: 519.335, end: 523.168, text: "and re-enable the Functional Context aspect to bring our slot back." },
    { start: 526.468, end: 531.748, text: "Chapter 4: The Red Arrows — Deciding What Is a Configuration Element." },
    { start: 534.928, end: 538.608, text: "Let us move to the second architectural dilemma explored in the paper:" },
    { start: 539.348, end: 542.668, text: "forming detailed rules for product configuration management." },
    { start: 545.468, end: 547.528, text: "When you release a product configuration," },
    { start: 548.168, end: 551.068, text: "what exactly is a Product Configuration Element?" },
    { start: 553.528, end: 558.468, text: "Is it only the physical hardware box, or is it the functional allocation and" },
    { start: 558.468, end: 559.908, text: "software environment as well?" },
    { start: 562.348, end: 567.328, text: "Follow the red specialisation arrows at the bottom of the grey SMRM layer." },
    { start: 570.448, end: 574.988, text: "Right now, let us set the Configuration Rule selector on the right of our meta" },
    { start: 574.988, end: 576.688, text: "toolbar to Part Only." },
    { start: 579.588, end: 584.028, text: "Notice that only a single red specialisation arrow points from Physical" },
    { start: 584.028, end: 586.388, text: "Part to Product Configuration Element." },
    { start: 588.708, end: 591.648, text: "This represents a traditional hardware-centric view:" },
    { start: 592.248, end: 595.308, text: "only physical parts carry configuration part numbers." },
    { start: 598.208, end: 603.588, text: "Now, watch the bottom of the graph as we change the rule to Part + Slot Allocation." },
    { start: 606.768, end: 611.448, text: "A second red specialisation arrow immediately appears, connecting Functional" },
    { start: 611.448, end: 613.908, text: "Slot to Product Configuration Element." },
    { start: 616.248, end: 620.688, text: "In this regime, both the physical component and its functional allocation" },
    { start: 620.688, end: 623.428, text: "slot are tracked under configuration control." },
    { start: 626.348, end: 632.188, text: "And if we switch the rule to System + Part + Slot, a third red arrow locks" },
    { start: 632.188, end: 635.488, text: "the top-level System into configuration management as well." },
    { start: 638.408, end: 642.828, text: "Notice how these critical engineering governance decisions are made cleanly at" },
    { start: 642.828, end: 648.048, text: "the grey SMRM concept layer, completely independent of whether our underlying" },
    { start: 648.048, end: 651.588, text: "database is Neo4j or an RDF triple store." },
    { start: 654.968, end: 660.128, text: "Chapter 5: The Firewall Against Technology Churn — Swapping Standards." },
    { start: 663.308, end: 667.408, text: "This brings us to the ultimate architectural question in the automotive industry:" },
    { start: 668.188, end: 672.108, text: "In a four-year vehicle programme where requirements evolve constantly," },
    { start: 672.748, end: 678.128, text: "how do we avoid being paralysed by a rigid ontology or a painful database migration?" },
    { start: 678.128, end: 684.728, text: "The answer is architectural decoupling across layers." },
    { start: 687.408, end: 692.148, text: "Watch all four floors of our meta-graph as we switch the Top-Level Ontology at the" },
    { start: 692.148, end: 698.848, text: "top of the screen from BFO in 3D to ISO 15926 in 4D." },
    { start: 701.708, end: 705.788, text: "Look closely at what changed on the canvas—and what did not change!" },
    { start: 708.488, end: 713.308, text: "The cyan URMSM Dimensions and Aspects did not change." },
    { start: 715.768, end: 722.128, text: "The grey SMRM domain concepts—System, Slot, Part, and Product Configuration" },
    { start: 722.128, end: 726.448, text: "Element—and their red configuration rules did not change at all!" },
    { start: 729.364, end: 735.624, text: "Only the third floor—the white SMIM Information Elements—swapped from BFO" },
    { start: 735.624, end: 742.484, text: "continuants to ISO 15926 four-dimensional extents: :ActualIndividual," },
    { start: 742.484, end: 749.264, text: ":State, and :DefectClass, automatically rewiring the live instance data connected to them." },
    { start: 752.144, end: 758.144, text: "Even if we drop down to a Naive Graph, the white SMIM boxes simplify into basic" },
    { start: 758.144, end: 763.264, text: "property graph nodes and inline attributes, while our grey SMRM concept" },
    { start: 763.264, end: 764.964, text: "dictionary remains untouched." },
    { start: 767.784, end: 769.544, text: "Let us switch back to BFO." },
    { start: 772.044, end: 775.524, text: "The SMRM layer acts as a protective firewall:" },
    { start: 776.144, end: 781.164, text: "your systems engineers work with stable domain concepts, while data architects can" },
    { start: 781.164, end: 785.244, text: "evolve or swap the formal ontology and storage engine underneath." },
    { start: 788.544, end: 793.644, text: "Chapter 6: Closing the Loop — From Meta-Model to the Engineer's Desk." },
    { start: 796.944, end: 803.604, text: "Finally, let us close the loop of IEC 63339 by switching from the Meta-Model" },
    { start: 803.604, end: 806.884, text: "view back to the Engineer SMRM viewpoint." },
    { start: 809.744, end: 815.244, text: "Look at the clean three-node diagram on the canvas and the hierarchical BOM Tree" },
    { start: 815.244, end: 816.864, text: "Structure in the top right panel." },
    { start: 819.204, end: 824.484, text: "The manufacturing engineer looking at this BOM tree does not see cyan Dimensions," },
    { start: 825.004, end: 829.264, text: "white BFO classes, or RDF reification hexagons." },
    { start: 831.644, end: 836.604, text: "Yet every single node they see is governed, justified, and traced through" },
    { start: 836.604, end: 838.184, text: "that four-layer architecture." },
    { start: 841.084, end: 847.824, text: "That is why a Knowledge System built on IEC 63339 is not a rigid prison that" },
    { start: 847.824, end: 850.284, text: "forces you to guess every rule on day one." },
    { start: 852.664, end: 857.644, text: "It is a living map that lets you start small, justify every concept through a" },
    { start: 857.644, end: 863.044, text: "clear stakeholder aspect, and evolve your engineering models iteratively—without" },
    { start: 863.044, end: 865.444, text: "ever losing sight of the forest for the trees." }
  ],

  timeline: [
    // =========================================================================
    // CHAPTER 1: LOST IN THE FOREST (Instance Graph in 4D ISO 15926 -> Meta)
    // =========================================================================
    {
      time: 0.0,
      action: (state, renderGraph) => {
        clearMetaArchitectureHighlights();
        if (state.qdikw) state.qdikw.active = false;
        if (state.figureOverlay) state.figureOverlay.visible = false;
        if (state.metaConfig) {
          state.metaConfig.enableFunctionalSlotAspect = true;
          state.metaConfig.configElementRule = 'PART_AND_SLOT';
        }
        seedBaselineHistory(state);
        state.showHistory = true;
        state.ontology = 'ISO15926';
        setPerspective('SMIM');
        state.graphEngine = 'MERMAID';
        renderGraph();
      }
    },
    {
      time: 13.90,
      action: () => {
        highlightElements('#canvas-container');
      }
    },
    {
      time: 20.00,
      action: () => {
        highlightGraphNodes(['4d_ARM_SN_404', '4d_Vehicle_1', '4d_Warehouse_1']);
      }
    },
    {
      time: 39.56,
      action: () => {
        highlightGraphNodes([]);
      }
    },
    {
      // "Watch the canvas as we switch our perspective to the IEC 63339 Meta-Model view."
      time: 109.82,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        setPerspective('URMSM_META');
        highlightElements(['#ctrl-view-meta', '#meta-model-toolbar'], 'tour-amber-highlight');
        renderGraph();
      }
    },

    // =========================================================================
    // CHAPTER 2: RIDING THE 4-STOREY ELEVATOR OF IEC 63339
    // =========================================================================
    {
      time: 131.18,
      action: (state, renderGraph) => {
        setPerspective('URMSM_META');
        state.ontology = 'BFO';
        highlightElements('#ctrl-view-meta');
        highlightGraphNodes([]);
        renderGraph();
      }
    },
    {
      // "using the colour legend on the bottom left."
      time: 140.14,
      action: () => {
        highlightElements('.graph-legend', 'tour-amber-highlight');
      }
    },
    {
      // "The top floor is represented by the bright cyan boxes: the URMSM layer..."
      time: 147.42,
      action: () => {
        highlightElements('#canvas-container');
        highlightGraphNodes(['Dim_PD', 'Dim_Mfg', 'Dim_Std', 'Asp_CM', 'Asp_BOM', 'Asp_TLO']);
      }
    },
    {
      // "Notice the three high-level Dimensions on the canvas: Product Development, Manufacturing, and Standardised Approach."
      time: 164.04,
      action: () => {
        highlightGraphNodes(['Dim_PD', 'Dim_Mfg', 'Dim_Std']);
      }
    },
    {
      // "Each Dimension is broken down into concrete Aspects..."
      time: 174.48,
      action: () => {
        highlightGraphNodes(['Asp_CM', 'Asp_BOM', 'Asp_TLO']);
      }
    },
    {
      // "Now, follow the aggregation arrows from those cyan Aspects to the next floor: the grey boxes."
      time: 201.92,
      action: () => {
        highlightGraphNodes(['Con_System', 'Con_Part', 'Con_Slot', 'Con_ConfigElem']);
      }
    },
    {
      // "Here live our canonical domain Concepts: System, Physical Part, Functional Slot, and Product Configuration Element."
      time: 217.68,
      action: () => {
        highlightGraphNodes(['Con_System', 'Con_Part', 'Con_Slot', 'Con_ConfigElem']);
      }
    },
    {
      // "Next, follow the specialisation arrows to the third floor: the white boxes with dark borders."
      time: 244.00,
      action: () => {
        highlightElements('#ctrl-onto-bfo', 'tour-amber-highlight');
        highlightGraphNodes(['IE_MaterialEntity', 'IE_Site', 'IE_Quality']);
      }
    },
    {
      // "Finally, follow the dashed instantiation lines to the ground floor: the SMS layer..."
      time: 284.04,
      action: () => {
        highlightElements('#canvas-container');
        highlightGraphNodes([
          'Vehicle_1',
          'Warehouse_1',
          'ARM_SN_404',
          'Slot_Vehicle_1_ARM_SN_404',
          'qual_ARM_SN_404_crack',
          'qual_ARM_SN_404_crack_critical'
        ]);
      }
    },
    {
      // "In fact, watch what happens if we use the engineer's toolbar right now to register a new component, ECU_Module_7..."
      time: 304.66,
      action: (state, renderGraph, ui) => {
        highlightGraphNodes([]);
        if (ui) {
          ui.bizRegType.value = 'Part';
          ui.bizRegId.value = 'ECU_Module_7';
        }
        highlightElements(['#biz-reg-type', '#biz-reg-id', '#biz-reg-btn'], 'tour-amber-highlight');
      }
    },
    {
      // "...and install it into Vehicle_1."
      time: 312.50,
      action: (state, renderGraph, ui) => {
        state.eventLog.push(
          createRegisterPartEvent('ECU_Module_7', 80, 'Part', nextSequence()),
          createAssembleEvent('Vehicle_1', 'ECU_Module_7', 'mounted_in', 80, nextSequence())
        );
        if (ui) {
          ui.bizRegId.value = '';
          ui.bizInstSource.value = 'ECU_Module_7';
          ui.bizInstTarget.value = 'Vehicle_1';
        }
        highlightElements(['#biz-inst-source', '#biz-inst-target', '#biz-inst-btn'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['ECU_Module_7', 'IE_MaterialEntity']);
      }
    },
    {
      // "The new instance immediately appears on the canvas and wires itself to :MaterialEntity..."
      time: 319.82,
      action: () => {
        highlightElements('#canvas-container');
        highlightGraphNodes(['ECU_Module_7', 'IE_MaterialEntity']);
      }
    },

    // =========================================================================
    // CHAPTER 3: FORMALISING SCOPE — MODEL WHAT YOU NEED (Slide 15)
    // =========================================================================
    {
      time: 338.54,
      action: (state, renderGraph) => {
        // Restore clean baseline without ECU_Module_7 so Node Store has exactly 6 nodes
        seedBaselineHistory(state);
        state.metaConfig.enableFunctionalSlotAspect = true;
        setPerspective('URMSM_META');
        state.ontology = 'BFO';
        highlightElements('#meta-model-toolbar');
        highlightGraphNodes([]);
        renderGraph();
      }
    },
    {
      // "Look at the grey box labelled Concept: Functional Object / Slot (ISO 81346)."
      time: 380.10,
      action: () => {
        highlightGraphNodes(['Con_Slot']);
      }
    },
    {
      // "Because the cyan Aspect—Concept & Functional Context—is currently active in our toolbar..."
      time: 395.54,
      action: () => {
        highlightElements('#meta-toggle-slot', 'tour-amber-highlight');
        highlightGraphNodes(['Asp_CM', 'Con_Slot']);
      }
    },
    {
      // "Let us uncheck the Functional Context aspect toggle in the Meta-Model toolbar."
      time: 419.88,
      action: (state, renderGraph) => {
        state.metaConfig.enableFunctionalSlotAspect = false;
        highlightElements('#meta-toggle-slot', 'tour-amber-highlight');
        highlightGraphNodes([]);
        renderGraph();
      }
    },
    {
      // "First, at the grey SMRM layer, the Functional Slot concept vanishes completely, and the aspect links via a direct scope arrow..."
      time: 436.46,
      action: () => {
        highlightGraphNodes(['Asp_CM', 'Con_System', 'Con_Part']);
      }
    },
    {
      // "Second, at the white SMIM layer, :BFO_Site is disconnected..."
      time: 450.48,
      action: () => {
        highlightGraphNodes(['IE_Site']);
      }
    },
    {
      // "And third—most importantly—look at the live instance data on the canvas and in the Node Store table on the right!"
      time: 459.74,
      action: () => {
        highlightElements('#storage-content', 'tour-amber-highlight');
        highlightGraphNodes(['Vehicle_1', 'ARM_SN_404']);
      }
    },
    {
      // "Even if we switch to the Logical SMIM view for a moment, we see that Vehicle_1 and ARM_SN_404 now connect directly..."
      time: 488.74,
      action: (state, renderGraph) => {
        setPerspective('SMIM');
        highlightElements(['#ctrl-view-logical', '#canvas-container'], 'tour-amber-highlight');
        highlightGraphNodes(['Vehicle_1', 'ARM_SN_404']);
        renderGraph();
      }
    },
    {
      // "Let us return to the Meta-Model view and re-enable the Functional Context aspect to bring our slot back."
      time: 517.08,
      action: (state, renderGraph) => {
        setPerspective('URMSM_META');
        state.metaConfig.enableFunctionalSlotAspect = true;
        highlightElements(['#ctrl-view-meta', '#meta-toggle-slot'], 'tour-amber-highlight');
        highlightGraphNodes(['Con_Slot', 'Slot_Vehicle_1_ARM_SN_404']);
        renderGraph();
      }
    },

    // =========================================================================
    // CHAPTER 4: THE RED ARROWS — CONFIGURATION ELEMENT RULES (Slide 16)
    // =========================================================================
    {
      time: 526.46,
      action: (state, renderGraph) => {
        setPerspective('URMSM_META');
        state.metaConfig.enableFunctionalSlotAspect = true;
        highlightElements('#meta-select-config-rule');
        highlightGraphNodes(['Con_ConfigElem']);
        renderGraph();
      }
    },
    {
      // "Follow the red specialisation arrows at the bottom of the grey SMRM layer."
      time: 562.34,
      action: () => {
        highlightGraphNodes(['Con_System', 'Con_Slot', 'Con_Part', 'Con_ConfigElem']);
      }
    },
    {
      // "Right now, let us set the Configuration Rule selector on the right of our meta toolbar to Part Only."
      time: 570.44,
      action: (state, renderGraph) => {
        state.metaConfig.configElementRule = 'PART_ONLY';
        highlightElements('#meta-select-config-rule', 'tour-amber-highlight');
        openDropdownTemporary('#meta-select-config-rule', 5000);
        renderGraph();
        highlightGraphNodes(['Con_Part', 'Con_ConfigElem']);
      }
    },
    {
      // "Now, watch the bottom of the graph as we change the rule to Part + Slot Allocation."
      time: 598.20,
      action: (state, renderGraph) => {
        state.metaConfig.configElementRule = 'PART_AND_SLOT';
        highlightElements('#meta-select-config-rule', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Con_Part', 'Con_Slot', 'Con_ConfigElem']);
      }
    },
    {
      // "And if we switch the rule to System + Part + Slot, a third red arrow locks the top-level System..."
      time: 626.34,
      action: (state, renderGraph) => {
        state.metaConfig.configElementRule = 'SYSTEM_PART_SLOT';
        highlightElements('#meta-select-config-rule', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Con_System', 'Con_Part', 'Con_Slot', 'Con_ConfigElem']);
      }
    },

    // =========================================================================
    // CHAPTER 5: THE FIREWALL AGAINST TECHNOLOGY CHURN (Slide 17)
    // =========================================================================
    {
      time: 654.96,
      action: () => {
        highlightElements(['#ctrl-onto-bfo', '#ctrl-onto-iso', '#ctrl-onto-naive-node']);
        highlightGraphNodes([]);
      }
    },
    {
      // "Watch all four floors of our meta-graph as we switch the Top-Level Ontology at the top of the screen from BFO in 3D to ISO 15926 in 4D."
      time: 693.50,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        highlightElements('#ctrl-onto-iso', 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "The cyan URMSM Dimensions and Aspects did not change."
      time: 708.48,
      action: () => {
        highlightGraphNodes(['Dim_PD', 'Dim_Mfg', 'Dim_Std', 'Asp_CM', 'Asp_BOM', 'Asp_TLO']);
      }
    },
    {
      // "The grey SMRM domain concepts—System, Slot, Part, and Product Configuration Element—and their red configuration rules did not change at all!"
      time: 715.76,
      action: () => {
        highlightGraphNodes(['Con_System', 'Con_Slot', 'Con_Part', 'Con_ConfigElem']);
      }
    },
    {
      // "Only the third floor—the white SMIM Information Elements—swapped from BFO continuants to ISO 15926 four-dimensional extents..."
      time: 729.36,
      action: () => {
        highlightGraphNodes(['IE_ActualIndividual', 'IE_State', 'IE_Defect']);
      }
    },
    {
      // "Even if we drop down to a Naive Graph, the white SMIM boxes simplify..."
      time: 752.14,
      action: (state, renderGraph) => {
        state.ontology = 'NAIVE_NODE';
        highlightElements('#ctrl-onto-naive-node', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['IE_NaiveNode', 'IE_NaiveProp']);
      }
    },
    {
      // "Let us switch back to BFO."
      time: 767.78,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        highlightElements('#ctrl-onto-bfo', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Con_System', 'Con_Slot', 'Con_Part', 'Con_ConfigElem']);
      }
    },

    // =========================================================================
    // CHAPTER 6: CLOSING THE LOOP — ENGINEER VIEWPOINT (SMRM & BOM)
    // =========================================================================
    {
      time: 788.54,
      action: () => {
        highlightGraphNodes([]);
        highlightElements('#ctrl-view-meta');
      }
    },
    {
      // "Finally, let us close the loop of IEC 63339 by switching from the Meta-Model view back to the Engineer SMRM viewpoint."
      time: 799.50,
      action: (state, renderGraph) => {
        setPerspective('SMRM');
        highlightElements(['#ctrl-view-smrm', '#canvas-container'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Look at the clean three-node diagram on the canvas and the hierarchical BOM Tree Structure in the top right panel."
      time: 809.74,
      action: () => {
        highlightElements(['#tree-container', '#canvas-container'], 'tour-amber-highlight');
        highlightGraphNodes(['Vehicle_1', 'ARM_SN_404', 'Warehouse_1']);
      }
    },
    {
      time: 841.08,
      action: () => {
        clearMetaArchitectureHighlights();
      }
    }
  ]
};

export function resetMetaArchitectureTimeline() {
  lastExecutedStep = -1;
  clearMetaArchitectureHighlights();
}

export function onMetaArchitectureTimeUpdate(currentTime, state, renderGraph, uiRefs) {
  const steps = metaArchitectureScenario.timeline;
  for (let i = 0; i < steps.length; i++) {
    if (currentTime >= steps[i].time && i > lastExecutedStep) {
      lastExecutedStep = i;
      steps[i].action(state, renderGraph, uiRefs);
    }
  }
}