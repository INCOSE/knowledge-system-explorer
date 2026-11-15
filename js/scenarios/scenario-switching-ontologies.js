/**
 * SCENARIO: SWITCHING ONTOLOGIES — BFO (3D) TO ISO 15926 (4D) MIGRATION
 * ---------------------------------------------------------------------
 * Full 14m07s narrative (157 synchronised subtitles, 6 interactive chapters)
 * exploring topological shock (1-to-N state slicing), cross-state qualities,
 * temporal underdetermination (T50->T60 transit gap & human assumption policies),
 * the RDF/LPG storage paradox, and IEC 63339 event-sourced projection.
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

export const SWITCHING_ONTOLOGIES_CHAPTERS = [
  { id: 'CH1_ILLUSION', label: '1. Dictionary Illusion', time: 5.62 },
  { id: 'CH2_SHOCK', label: '2. Topological Shock', time: 130.12 },
  { id: 'CH3_QUALITY', label: '3. Cross-State Quality', time: 258.82 },
  { id: 'CH4_GAP', label: '4. Transit Gap (T50–T60)', time: 377.68 },
  { id: 'CH5_PARADOX', label: '5. Storage Paradox', time: 574.02 },
  { id: 'CH6_SOLUTION', label: '6. IEC 63339 Solution', time: 718.26 }
];

export function clearSwitchingOntologiesHighlights() {
  clearMetaArchitectureHighlights();
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

/**
 * Seeds the canonical Discrete Snapshot event log (with the T50 -> T60 gap).
 */
function seedDiscreteHistory(state) {
  state.eventLog.splice(0, state.eventLog.length);
  state.edgeSequence = 1;
  state.eventLog.push(
    createRegisterPartEvent('Vehicle_1', 0, 'Vehicle', 'veh1'),
    createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', 'wh1'),
    createRegisterPartEvent('ARM_SN_404', 10, 'Part', 'arm404'),
    createAssembleEvent('Vehicle_1', 'ARM_SN_404', 'mounted_in', 10, 'asm_veh_10'),
    createReportDefectEvent('ARM_SN_404', 'crack', '2mm', 30, 'def_crack_30'),
    createDismantleEvent('ARM_SN_404', 50, 'dism_veh_50'),
    createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 60, 'store_wh_60')
  );
  state.currentTime = 60;
}

/**
 * Seeds the Continuous In-Transit event log (bridging T50 -> T60 with an explicit transit state).
 */
function seedContinuousTransitHistory(state) {
  state.eventLog.splice(0, state.eventLog.length);
  state.edgeSequence = 1;
  state.eventLog.push(
    createRegisterPartEvent('Vehicle_1', 0, 'Vehicle', 'veh1'),
    createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', 'wh1'),
    createRegisterPartEvent('Transit_Corridor', 0, 'Warehouse', 'transit_hub'),
    createRegisterPartEvent('ARM_SN_404', 10, 'Part', 'arm404'),
    createAssembleEvent('Vehicle_1', 'ARM_SN_404', 'mounted_in', 10, 'asm_veh_10'),
    createReportDefectEvent('ARM_SN_404', 'crack', '2mm', 30, 'def_crack_30'),
    createDismantleEvent('ARM_SN_404', 50, 'dism_veh_50'),
    createAssembleEvent('Transit_Corridor', 'ARM_SN_404', 'stored_at', 50, 'transit_50'),
    createDismantleEvent('ARM_SN_404', 60, 'dism_transit_60'),
    createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 60, 'store_wh_60')
  );
  state.currentTime = 60;
}

export const switchingOntologiesScenario = {
  id: 'SWITCHING_ONTOLOGIES',
  title: '🔄 Switching Ontologies: BFO (3D) ↔ ISO 15926 (4D) Migration & Underdetermination',
  audioSrc: './narratives/Switching_Ontologies_-_IEC_63339.mp3',
  fallbackDuration: 847,
  chapters: SWITCHING_ONTOLOGIES_CHAPTERS,

  subtitles: [
    { start: 0.14, end: 3.72, text: "Welcome to the Ontology Translation and Migration Demonstrator." },
    { start: 5.62, end: 11.44, text: "Chapter 1: The Dictionary Illusion — Why Ontologies Are Not Vocabulary Lists." },
    { start: 12.82, end: 17.20, text: "Suppose your engineering organization has spent three years building a knowledge" },
    { start: 17.20, end: 22.22, text: "graph using the Basic Formal Ontology, BFO, in three dimensions." },
    { start: 22.92, end: 28.04, text: "Now, you enter a joint venture with a heavy industrial consortium or a long-term" },
    { start: 28.04, end: 33.88, text: "defense program that mandates ISO 15926 in four dimensions." },
    { start: 35.24, end: 37.90, text: "Management asks a seemingly innocent question:" },
    { start: 38.70, end: 44.32, text: "\"Both databases are mathematically rigorous, and both use W3C RDF triples." },
    { start: 45.00, end: 51.36, text: "Can we simply write a script that renames BFO classes into ISO 15926 classes?\"" },
    { start: 53.18, end: 58.42, text: "Let us look at the canvas in BFO logical mode to see why that assumption is a trap." },
    { start: 58.42, end: 65.26, text: "On the screen, we have tracked a physical suspension arm, serial number" },
    { start: 65.26, end: 71.10, text: "ARM_SN_404, across its operational history." },
    { start: 71.74, end: 76.66, text: "At time T equals 10, the arm was mounted into the front suspension slot of" },
    { start: 76.66, end: 83.543, text: "Vehicle_1. At time T equals 30, an inspection recorded a minor defect:" },
    { start: 83.543, end: 84.86, text: "a 2-millimetre crack." },
    { start: 85.48, end: 90.90, text: "At time T equals 50, the arm was dismantled from the vehicle, and at time T" },
    { start: 90.90, end: 95.84, text: "equals 60, it was placed into Warehouse_1 for warranty analysis." },
    { start: 97.70, end: 99.94, text: "In BFO, look at the topology." },
    { start: 100.62, end: 104.44, text: "How many nodes represent the suspension arm across this entire story?" },
    { start: 105.12, end: 112.46, text: "Just one: the enduring three-dimensional continuant node, ARM_SN_404." },
    { start: 113.26, end: 117.54, text: "It passes through time as a single identity, while its relationships carry" },
    { start: 117.54, end: 119.00, text: "the historical timestamps." },
    { start: 121.30, end: 127.62, text: "Now, watch what happens if we try to translate this database into ISO 15926." },
    { start: 130.12, end: 133.16, text: "Chapter 2: Topological Shock —" },
    { start: 133.22, end: 136.50, text: "Splitting One Continuant Into Four-Dimensional Worms." },
    { start: 137.88, end: 145.72, text: "Let us switch the ontological lens from BFO in 3D to ISO 15926 in 4D." },
    { start: 148.08, end: 149.64, text: "Look closely at the canvas." },
    { start: 150.26, end: 155.04, text: "A one-to-one node mapping did not happen, and mathematically could not happen." },
    { start: 156.70, end: 161.54, text: "In a four-dimensional worldview, a physical object is not an enduring box" },
    { start: 161.54, end: 163.36, text: "that changes its links over time." },
    { start: 163.98, end: 166.66, text: "It is a four-dimensional space-time worm." },
    { start: 167.28, end: 174.22, text: "The single BFO node ARM_SN_404 has been shattered into" },
    { start: 174.22, end: 175.94, text: "multiple distinct entities." },
    { start: 177.78, end: 181.049, text: "First, at the top, the translator had to create" },
    { start: 181.049, end: 187.88, text: "the whole-life individual, ARM_SN_404_4D." },
    { start: 188.70, end: 194.14, text: "Notice that this 4D root node has zero direct links to the vehicle, the slot, or" },
    { start: 194.14, end: 194.88, text: "the warehouse." },
    { start: 197.18, end: 202.54, text: "Second, for every historical episode in our database, the translator had to slice" },
    { start: 202.54, end: 208.14, text: "a separate immutable temporal part, a State node, and wire it back to the 4D" },
    { start: 208.14, end: 210.14, text: "parent via temporalPartOf." },
    { start: 210.98, end: 216.62, text: "One node in BFO became three separate nodes in ISO 15926:" },
    { start: 217.24, end: 223.68, text: "the timeless 4D worm, the historical state slice mounted in the vehicle from T10 to T50," },
    { start: 224.32, end: 228.48, text: "and the active state slice sitting in the warehouse from T60 onwards." },
    { start: 230.32, end: 235.24, text: "Even more strikingly, look at Vehicle_1 and its functional slot." },
    { start: 235.86, end: 241.30, text: "Because the suspension arm was removed at T50, strict four-dimensional mereology" },
    { start: 241.30, end: 245.96, text: "forced the translator to slice temporal states for the slot and the vehicle as well." },
    { start: 247.80, end: 252.42, text: "You are not renaming labels. You are compiling a three-dimensional graph of" },
    { start: 252.42, end: 256.339, text: "things into a four-dimensional geometry of space-time slices." },
    { start: 258.82, end: 264.42, text: "Chapter 3: The Cross-State Quality Dilemma — When a Defect Outlives a State." },
    { start: 266.26, end: 271.02, text: "Now let us examine a deeper mathematical puzzle that every migration engineer hits:" },
    { start: 271.02, end: 275.72, text: "what happens to properties and defects when an object changes its state?" },
    { start: 277.64, end: 281.90, text: "Let us switch back to BFO for a moment and look at the orange quality node:" },
    { start: 282.52, end: 284.14, text: "Crack, 2 millimetres." },
    { start: 286.32, end: 291.26, text: "In BFO, a quality inheres directly in its three-dimensional bearer," },
    { start: 291.26, end: 298.04, text: "ARM_SN_404, from T equals 30 right up to the present moment." },
    { start: 298.82, end: 303.92, text: "BFO does not care that the arm was removed from the vehicle at T50 and put into the" },
    { start: 303.92, end: 305.38, text: "warehouse at T60." },
    { start: 306.14, end: 309.92, text: "The crack simply rides along on the single enduring part node." },
    { start: 312.16, end: 318.24, text: "Now switch back to ISO 15926 and look at where the red Defect node is attached." },
    { start: 320.36, end: 326.22, text: "In 4D, a defect cannot hang on the timeless 4D worm because the worm was not" },
    { start: 326.22, end: 328.20, text: "born cracked at T equals 0." },
    { start: 328.90, end: 332.62, text: "A defect must classify a specific temporal state slice." },
    { start: 334.14, end: 339.52, text: "But wait: the crack was discovered at T30 while the arm was in the vehicle state," },
    { start: 340.08, end: 344.38, text: "and the crack is still there at T60 while the arm is in the warehouse state!" },
    { start: 346.26, end: 353.00, text: "When writing a translator from BFO to ISO 15926, the algorithm cannot simply" },
    { start: 353.00, end: 355.54, text: "copy the inheres_in edge." },
    { start: 356.22, end: 360.84, text: "It must compare the temporal interval of the BFO quality against the temporal" },
    { start: 360.84, end: 365.82, text: "boundaries of every 4D state slice and decide whether to bind the defect to the" },
    { start: 365.82, end: 371.135, text: "historical state, propagate it across subsequent state slices, or slice the state" },
    { start: 371.135, end: 374.916, text: "yet again at T equals 30 when the crack first appeared." },
    { start: 377.676, end: 380.616, text: "Chapter 4: The Underdetermination Trap —" },
    { start: 381.276, end: 384.096, text: "What Happened Between T50 and T60?" },
    { start: 385.496, end: 388.636, text: "Let us look even closer at the timestamps on our canvas." },
    { start: 389.376, end: 391.616, text: "Notice a subtle gap in our timeline." },
    { start: 393.696, end: 402.276, text: "At time T equals 50, ARM_SN_404 was dismantled from Vehicle_1." },
    { start: 402.916, end: 407.456, text: "At time T equals 60, it was registered in Warehouse_1." },
    { start: 409.476, end: 413.476, text: "Where was the physical suspension arm at time T equals 55?" },
    { start: 415.436, end: 421.556, text: "In a three-dimensional BFO database, nobody notices this gap. Between T50 and" },
    { start: 421.556, end: 428.516, text: "T60, the node ARM_SN_404 simply sits in the database" },
    { start: 428.516, end: 433.896, text: "with no active mounting edge. Because a 3D continuant exists independently of its" },
    { start: 433.896, end: 437.316, text: "location edges, the database remains completely valid." },
    { start: 439.136, end: 443.896, text: "Now, imagine you are writing a deterministic compiler to convert this BFO" },
    { start: 443.896, end: 449.576, text: "database into a strict four-dimensional ISO 15926 repository." },
    { start: 450.456, end: 454.516, text: "You immediately hit a philosophical wall known as underdetermination." },
    { start: 456.676, end: 463.616, text: "Even though both BFO and ISO 15926 are governed by strict logic, the source" },
    { start: 463.616, end: 469.056, text: "3D data does not contain enough continuous information to uniquely determine the 4D" },
    { start: 469.056, end: 472.156, text: "space-time worm between T50 and T60." },
    { start: 474.036, end: 478.816, text: "Before the math can run, a human architect must choose an explicit translation" },
    { start: 478.836, end: 480.736, text: "policy — an assumption rule." },
    { start: 482.976, end: 485.916, text: "Policy 1 is the Discrete Snapshot Assumption." },
    { start: 486.656, end: 491.656, text: "Under this policy, our translator only generates state slices for explicitly" },
    { start: 491.656, end: 493.016, text: "recorded relationships." },
    { start: 493.716, end: 499.036, text: "As you can see on the canvas right now, the first state slice ends at T50, and the" },
    { start: 499.036, end: 501.436, text: "second state slice begins at T60." },
    { start: 502.156, end: 506.796, text: "Between T50 and T60, the 4D worm has a temporal gap." },
    { start: 508.596, end: 513.316, text: "Policy 2 is the Continuous Existence, or In-Transit, Assumption." },
    { start: 513.996, end: 518.896, text: "In strict physical reality, a 10-kilogram piece of steel cannot vanish from" },
    { start: 518.896, end: 523.296, text: "space-time at T50 and materialize out of thin air at T60." },
    { start: 524.016, end: 530.916, text: "If your target ISO 15926 system requires an unbroken space-time continuum, the" },
    { start: 530.916, end: 533.856, text: "translator must synthesize an intermediate state." },
    { start: 535.676, end: 540.296, text: "Watch the canvas as we apply the continuous in-transit translation policy" },
    { start: 540.296, end: 543.116, text: "for the interval from T50 to T60." },
    { start: 545.456, end: 550.616, text: "The translator automatically bridges the 10-second vacuum by generating an explicit" },
    { start: 550.616, end: 554.796, text: "transit state between the vehicle dismantle event and the warehouse arrival." },
    { start: 554.796, end: 558.956, text: "Same source data in BFO." },
    { start: 559.616, end: 564.916, text: "Two completely different, yet mathematically valid target graphs in ISO" },
    { start: 564.916, end: 569.322, text: "15926. Determinism only works after a human architect" },
    { start: 569.322, end: 571.716, text: "locks in the boundary assumptions." },
    { start: 574.016, end: 576.636, text: "Chapter 5: The Storage Paradox —" },
    { start: 577.236, end: 581.796, text: "Why RDF Prefers 4D While LPG Prefers 3D." },
    { start: 583.256, end: 588.656, text: "Now let us drop down to the physical database layer, SMS, to see a surprising" },
    { start: 588.656, end: 591.616, text: "twist when migrating actual database records." },
    { start: 593.496, end: 598.936, text: "Let us set our ontology to BFO and switch the perspective to Physical RDF." },
    { start: 601.136, end: 603.896, text: "Look at the canvas and the Turtle code under the bonnet." },
    { start: 604.596, end: 611.576, text: "As we saw in the architectural matrix, storing 3D BFO history in pure W3C RDF is" },
    { start: 611.576, end: 615.691, text: "painful. Because BFO puts timestamps on relationships" },
    { start: 615.691, end: 618.456, text: "and RDF predicates cannot hold properties," },
    { start: 619.096, end: 624.575, text: "every single assembly link had to be blown up into an artificial yellow hexagon: an" },
    { start: 624.575, end: 627.356, text: "rdf:Statement reification node." },
    { start: 629.656, end: 635.976, text: "Now, watch what happens when we translate this RDF database from BFO into ISO" },
    { start: 635.976, end: 639.656, text: "15926 while staying in Physical RDF." },
    { start: 642.456, end: 645.776, text: "Every single yellow reification hexagon vanishes!" },
    { start: 647.636, end: 651.976, text: "Why did the RDF graph become cleaner in 4D than it was in 3D?" },
    { start: 652.796, end: 659.956, text: "Because ISO 15926 already reified time at the ontological level by creating State nodes." },
    { start: 660.696, end: 667.376, text: "In RDF, attaching validFrom and validTo as literal ovals directly to a State node" },
    { start: 667.376, end: 669.656, text: "requires zero statement reification." },
    { start: 671.696, end: 677.556, text: "Conversely, if we switch the perspective to Physical LPG, a labeled property graph" },
    { start: 677.556, end: 680.796, text: "like Neo4j, the exact opposite happens." },
    { start: 682.696, end: 689.616, text: "In BFO plus LPG, the graph is compact and natural because timestamps sit inside the edges." },
    { start: 690.256, end: 697.216, text: "When you migrate to ISO 15926 in LPG, the node store table explodes with historical" },
    { start: 697.216, end: 701.376, text: "state vertices and artificial TRANSITION_TO pointers." },
    { start: 703.516, end: 710.156, text: "Translating between BFO and ISO 15926 is therefore never a neutral schema" },
    { start: 710.156, end: 713.926, text: "update. It fundamentally shifts the computational burden" },
    { start: 713.926, end: 715.876, text: "between your nodes and your edges." },
    { start: 718.256, end: 725.796, text: "Chapter 6: The IEC 63339 Solution — Don't Translate Graphs, Project Events." },
    { start: 727.156, end: 731.916, text: "So how should a modern engineering organization handle the tension between 3D" },
    { start: 731.916, end: 737.216, text: "and 4D ontologies without going bankrupt on graph-to-graph migration scripts?" },
    { start: 739.056, end: 744.196, text: "Let us switch our perspective to the IEC 63339 Meta-Model view." },
    { start: 746.416, end: 749.196, text: "Look at the four architectural floors on the canvas." },
    { start: 749.876, end: 756.496, text: "Notice how the grey SMRM domain concepts in the middle — System, Functional Slot," },
    { start: 756.496, end: 760.656, text: "Physical Part, and Configuration Element — remain completely stable." },
    { start: 762.516, end: 769.376, text: "In this workbench, we do not convert a BFO graph directly into an ISO 15926" },
    { start: 769.376, end: 773.296, text: "graph using brittle SPARQL or Cypher ETL pipelines." },
    { start: 774.976, end: 780.576, text: "Instead, we store our engineering history as an immutable, ontology-agnostic log of" },
    { start: 780.576, end: 783.096, text: "domain events at the SMRM level:" },
    { start: 783.836, end: 789.376, text: "register part, assemble into slot, report defect, dismantle, and store." },
    { start: 791.296, end: 796.416, text: "Watch the white SMIM layer, the third floor of our meta-model, as we toggle" },
    { start: 796.416, end: 800.356, text: "between BFO and ISO 15926." },
    { start: 803.156, end: 808.436, text: "Rather than mutating one complex graph into another, each ontology acts as a pure" },
    { start: 808.436, end: 812.176, text: "functional projection adapter over the same canonical event log." },
    { start: 813.976, end: 820.136, text: "When we finally switch to the Engineer SMRM viewpoint, all that underlying 3D and" },
    { start: 820.136, end: 825.036, text: "4D machinery collapses back into a clean, unified engineering view." },
    { start: 827.196, end: 829.776, text: "That is the ultimate architectural takeaway:" },
    { start: 830.596, end: 835.516, text: "never lock your raw engineering history inside the quirks of a single graph topology." },
    { start: 836.196, end: 841.616, text: "Capture domain events cleanly, state your temporal assumptions explicitly, and let" },
    { start: 841.616, end: 844.464, text: "your upper ontologies serve as interchangeable" },
    { start: 844.464, end: 846.516, text: "lenses over a single source of truth." }
  ],

  timeline: [
    // =========================================================================
    // CHAPTER 1: THE DICTIONARY ILLUSION (BFO 3D Logical View)
    // =========================================================================
    {
      time: 0.0,
      action: (state, renderGraph) => {
        clearSwitchingOntologiesHighlights();
        if (state.qdikw) state.qdikw.active = false;
        if (state.figureOverlay) state.figureOverlay.visible = false;
        if (state.metaConfig) {
          state.metaConfig.enableFunctionalSlotAspect = true;
          state.metaConfig.configElementRule = 'PART_AND_SLOT';
        }
        seedDiscreteHistory(state);
        state.showHistory = true;
        state.ontology = 'BFO';
        state.storage = 'LPG';
        setPerspective('SMIM');
        state.graphEngine = 'MERMAID';
        renderGraph();
      }
    },
    {
      // "Suppose your engineering organization has spent three years building a knowledge graph using BFO..."
      time: 12.82,
      action: () => {
        highlightElements('#ctrl-onto-bfo', 'tour-amber-highlight');
      }
    },
    {
      // "...mandates ISO 15926 in four dimensions."
      time: 28.04,
      action: () => {
        highlightElements('#ctrl-onto-iso', 'tour-amber-highlight');
      }
    },
    {
      // "Let us look at the canvas in BFO logical mode to see why that assumption is a trap."
      time: 53.18,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        setPerspective('SMIM');
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-logical', '#canvas-container']);
        renderGraph();
      }
    },
    {
      // Step-by-step live replay of the operational history from T=10 to T=60
      // "At time T equals 10, the arm was mounted into the front suspension slot of Vehicle_1."
      time: 71.74,
      action: (state, renderGraph) => {
        state.eventLog.splice(0, state.eventLog.length);
        state.currentTime = 10;
        state.eventLog.push(
          createRegisterPartEvent('Vehicle_1', 0, 'Vehicle', 'veh1'),
          createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', 'wh1'),
          createRegisterPartEvent('ARM_SN_404', 10, 'Part', 'arm404'),
          createAssembleEvent('Vehicle_1', 'ARM_SN_404', 'mounted_in', 10, 'asm_veh_10')
        );
        highlightElements(['#biz-time-badge', '#biz-inst-btn'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['Vehicle_1', 'Slot_Vehicle_1_ARM_SN_404', 'ARM_SN_404']);
      }
    },
    {
      // "At time T equals 30, an inspection recorded a minor defect, a 2 millimeter crack."
      time: 79.50,
      action: (state, renderGraph) => {
        state.currentTime = 30;
        state.eventLog.push(
          createReportDefectEvent('ARM_SN_404', 'crack', '2mm', 30, 'def_crack_30')
        );
        highlightElements(['#biz-time-badge', '#biz-def-btn'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['ARM_SN_404', 'qual_ARM_SN_404_crack']);
      }
    },
    {
      // "At time T equals 50, the arm was dismantled from the vehicle..."
      time: 85.48,
      action: (state, renderGraph) => {
        state.currentTime = 50;
        state.eventLog.push(
          createDismantleEvent('ARM_SN_404', 50, 'dism_veh_50')
        );
        highlightElements(['#biz-time-badge', '#biz-dism-btn'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['ARM_SN_404']);
      }
    },
    {
      // "...and at time T equals 60, it was placed into Warehouse_1 for warranty analysis."
      time: 90.90,
      action: (state, renderGraph) => {
        state.currentTime = 60;
        state.eventLog.push(
          createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 60, 'store_wh_60')
        );
        highlightElements(['#biz-time-badge', '#biz-store-btn'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['ARM_SN_404', 'Warehouse_1']);
      }
    },
    {
      // "How many nodes represent the suspension arm across this entire story? Just one: ARM_SN_404."
      time: 100.62,
      action: () => {
        highlightElements('#canvas-container');
        highlightGraphNodes(['ARM_SN_404']);
      }
    },

    // =========================================================================
    // CHAPTER 2: TOPOLOGICAL SHOCK (Splitting 1 Continuant into 4D Worms)
    // =========================================================================
    {
      // "Let us switch the ontological lens from BFO in 3D to ISO 15926 in 4D."
      time: 137.88,
      action: (state, renderGraph) => {
        seedDiscreteHistory(state);
        state.ontology = 'ISO15926';
        setPerspective('SMIM');
        highlightElements(['#ctrl-onto-iso', '#canvas-container'], 'tour-amber-highlight');
        highlightGraphNodes([]);
        renderGraph();
      }
    },
    {
      // "The single BFO node ARM_SN_404 has been shattered into multiple distinct entities."
      time: 167.28,
      action: () => {
        highlightGraphNodes([
          '4d_ARM_SN_404',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_10_asm_veh_10',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_60_store_wh_60'
        ]);
      }
    },
    {
      // "First, at the top, the translator had to create the whole-life individual, ARM_SN_404_4D."
      time: 177.78,
      action: () => {
        highlightGraphNodes(['4d_ARM_SN_404']);
      }
    },
    {
      // "Second, for every historical episode... slice a separate immutable temporal part, a State node..."
      time: 197.18,
      action: () => {
        highlightGraphNodes([
          '4d_ARM_SN_404',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_10_asm_veh_10',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_60_store_wh_60'
        ]);
      }
    },
    {
      // "Even more strikingly, look at Vehicle_1 and its functional slot..."
      time: 230.32,
      action: () => {
        highlightGraphNodes([
          '4d_Vehicle_1',
          'st_Vehicle_1_evt_asm_ARM_SN_404_10_asm_veh_10',
          '4d_Slot_Vehicle_1_ARM_SN_404',
          'st_Slot_Vehicle_1_ARM_SN_404_evt_asm_ARM_SN_404_10_asm_veh_10'
        ]);
      }
    },
    {
      time: 247.80,
      action: () => {
        highlightGraphNodes([]);
      }
    },

    // =========================================================================
    // CHAPTER 3: THE CROSS-STATE QUALITY DILEMMA
    // =========================================================================
    {
      // "Let us switch back to BFO for a moment and look at the orange quality node: Crack, 2 millimetres."
      time: 277.64,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        setPerspective('SMIM');
        highlightElements('#ctrl-onto-bfo', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['ARM_SN_404', 'qual_ARM_SN_404_crack']);
      }
    },
    {
      // "Now switch back to ISO 15926 and look at where the red Defect node is attached."
      time: 312.16,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        setPerspective('SMIM');
        highlightElements('#ctrl-onto-iso', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes([
          'def_ARM_SN_404_crack',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_10_asm_veh_10',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_60_store_wh_60'
        ]);
      }
    },
    {
      time: 356.22,
      action: () => {
        highlightGraphNodes([]);
      }
    },

    // =========================================================================
    // CHAPTER 4: THE UNDERDETERMINATION TRAP (What happened between T50 & T60?)
    // =========================================================================
    {
      time: 377.68,
      action: (state, renderGraph) => {
        seedDiscreteHistory(state);
        state.ontology = 'ISO15926';
        setPerspective('SMIM');
        highlightElements('#canvas-container');
        renderGraph();
        highlightGraphNodes([
          'st_ARM_SN_404_evt_asm_ARM_SN_404_10_asm_veh_10',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_60_store_wh_60'
        ]);
      }
    },
    {
      // "Where was the physical suspension arm at time T equals 55? In a 3D BFO database, nobody notices this gap..."
      time: 409.48,
      action: (state, renderGraph) => {
        state.currentTime = 55;
        state.ontology = 'BFO';
        state.showHistory = false;
        highlightElements(['#biz-time-badge', '#ctrl-onto-bfo'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['ARM_SN_404', 'qual_ARM_SN_404_crack']);
      }
    },
    {
      // "Now, imagine you are writing a deterministic compiler to convert this BFO database into a strict 4D ISO 15926 repository."
      time: 439.14,
      action: (state, renderGraph) => {
        state.currentTime = 60;
        state.showHistory = true;
        state.ontology = 'ISO15926';
        highlightElements(['#biz-time-badge', '#ctrl-onto-iso'], 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes([
          '4d_ARM_SN_404',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_10_asm_veh_10',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_60_store_wh_60'
        ]);
      }
    },
    {
      // "Policy 1 is the Discrete Snapshot Assumption... the first state slice ends at T50, and the second begins at T60."
      time: 482.98,
      action: (state, renderGraph) => {
        seedDiscreteHistory(state);
        state.ontology = 'ISO15926';
        setPerspective('SMIM');
        renderGraph();
        highlightGraphNodes([
          'st_ARM_SN_404_evt_asm_ARM_SN_404_10_asm_veh_10',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_60_store_wh_60'
        ]);
      }
    },
    {
      // "Watch the canvas as we apply the Continuous In-Transit translation policy for the interval from T50 to T60."
      time: 535.68,
      action: (state, renderGraph) => {
        seedContinuousTransitHistory(state);
        state.ontology = 'ISO15926';
        setPerspective('SMIM');
        highlightElements('#canvas-container', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes([
          '4d_Transit_Corridor',
          'st_Transit_Corridor_evt_asm_ARM_SN_404_50_transit_50',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_50_transit_50'
        ]);
      }
    },
    {
      // "Same source data in BFO. Two completely different, yet mathematically valid target graphs in ISO 15926."
      time: 554.80,
      action: () => {
        highlightGraphNodes([
          'st_ARM_SN_404_evt_asm_ARM_SN_404_10_asm_veh_10',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_50_transit_50',
          'st_ARM_SN_404_evt_asm_ARM_SN_404_60_store_wh_60'
        ]);
      }
    },

    // =========================================================================
    // CHAPTER 5: THE STORAGE PARADOX (Why RDF Prefers 4D While LPG Prefers 3D)
    // =========================================================================
    {
      // "Let us set our ontology to BFO and switch the perspective to Physical RDF."
      time: 593.50,
      action: (state, renderGraph) => {
        seedDiscreteHistory(state);
        state.ontology = 'BFO';
        state.storage = 'RDF';
        setPerspective('SMS_RDF');
        highlightGraphNodes([]);
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-physical-rdf', '#storage-content'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Now, watch what happens when we translate this RDF database from BFO into ISO 15926 while staying in Physical RDF."
      time: 629.66,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        state.storage = 'RDF';
        setPerspective('SMS_RDF');
        highlightElements(['#ctrl-onto-iso', '#ctrl-view-physical-rdf', '#canvas-container'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Conversely, if we switch the perspective to Physical LPG, a labeled property graph like Neo4j..."
      time: 671.70,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        state.storage = 'LPG';
        setPerspective('SMS_LPG');
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-physical-lpg', '#storage-content'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "When you migrate to ISO 15926 in LPG, the node store table explodes with historical state vertices and TRANSITION_TO pointers."
      time: 690.26,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        state.storage = 'LPG';
        setPerspective('SMS_LPG');
        highlightElements(['#ctrl-onto-iso', '#ctrl-view-physical-lpg', '#storage-content'], 'tour-amber-highlight');
        renderGraph();
      }
    },

    // =========================================================================
    // CHAPTER 6: THE IEC 63339 SOLUTION (Don't Translate Graphs, Project Events)
    // =========================================================================
    {
      // "Let us switch our perspective to the IEC 63339 Meta-Model view."
      time: 739.06,
      action: (state, renderGraph) => {
        seedDiscreteHistory(state);
        state.ontology = 'BFO';
        setPerspective('URMSM_META');
        highlightElements(['#ctrl-view-meta', '#canvas-container'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      // "Notice how the grey SMRM domain concepts in the middle — System, Functional Slot, Physical Part, and Configuration Element — remain completely stable."
      time: 749.88,
      action: () => {
        highlightGraphNodes(['Con_System', 'Con_Slot', 'Con_Part', 'Con_ConfigElem']);
      }
    },
    {
      // "Watch the white SMIM layer, the third floor of our meta-model, as we toggle between BFO and ISO 15926."
      time: 791.30,
      action: (state, renderGraph) => {
        state.ontology = 'ISO15926';
        highlightElements('#ctrl-onto-iso', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['IE_ActualIndividual', 'IE_State', 'IE_Defect']);
      }
    },
    {
      time: 800.50,
      action: (state, renderGraph) => {
        state.ontology = 'BFO';
        highlightElements('#ctrl-onto-bfo', 'tour-amber-highlight');
        renderGraph();
        highlightGraphNodes(['IE_MaterialEntity', 'IE_Site', 'IE_Quality']);
      }
    },
    {
      // "When we finally switch to the Engineer SMRM viewpoint, all that underlying 3D and 4D machinery collapses back into a clean, unified engineering view."
      time: 813.98,
      action: (state, renderGraph) => {
        setPerspective('SMRM');
        highlightElements(['#ctrl-view-smrm', '#canvas-container', '#tree-container'], 'tour-amber-highlight');
        highlightGraphNodes([]);
        renderGraph();
      }
    },
    {
      time: 830.60,
      action: () => {
        clearSwitchingOntologiesHighlights();
      }
    }
  ]
};

export function resetSwitchingOntologiesTimeline() {
  lastExecutedStep = -1;
  clearSwitchingOntologiesHighlights();
}

export function onSwitchingOntologiesTimeUpdate(currentTime, state, renderGraph, uiRefs) {
  const steps = switchingOntologiesScenario.timeline;
  for (let i = 0; i < steps.length; i++) {
    if (currentTime >= steps[i].time && i > lastExecutedStep) {
      lastExecutedStep = i;
      steps[i].action(state, renderGraph, uiRefs);
    }
  }
}