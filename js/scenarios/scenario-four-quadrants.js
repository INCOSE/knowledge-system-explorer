/**
 * SCENARIO: THE 4-QUADRANT ARCHITECTURAL MATRIX (BFO/15926 x LPG/RDF)
 * -------------------------------------------------------------------
 * Full 19m36s narrative with 213 synchronised subtitles, 7 interactive
 * chapters, slide overlays from ./figures/ontologiesGraphs/, and step-by-step
 * UI actions with sub-second visual staging.
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

export const FOUR_QUADRANTS_CHAPTERS = [
  { id: 'INTRO', label: '1. 2×2 Matrix', time: 0.0 },
  { id: 'SETUP', label: '2. Stress Test', time: 126.42 },
  { id: 'Q1', label: '3. Q1: BFO + LPG', time: 174.18 },
  { id: 'Q2', label: '4. Q2: BFO + RDF', time: 383.63 },
  { id: 'Q3', label: '5. Q3: 15926 + LPG', time: 590.49 },
  { id: 'Q4', label: '6. Q4: 15926 + RDF', time: 870.82 },
  { id: 'SUMMARY', label: '7. IEC 63339 Summary', time: 1088.76 }
];

export function clearFourQuadrantsHighlights() {
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
}

function highlightElements(selectors, styleClass = 'tour-pulse-highlight') {
  clearFourQuadrantsHighlights();
  if (!selectors || typeof document === 'undefined') return;
  const list = Array.isArray(selectors) ? selectors : [selectors];
  list.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.classList.add(styleClass);
  });
}

function showSlide(state, filename, caption) {
  if (!state.figureOverlay) return;
  state.figureOverlay.visible = true;
  state.figureOverlay.src = `./figures/ontologiesGraphs/${filename}`;
  state.figureOverlay.caption = caption;
  state.figureOverlay.attributionHtml = 'IEC 63339 Knowledge Architecture Workbench — 2×2 Architectural Matrix (SMIM × SMS)';
}

function hideSlide(state) {
  if (state.figureOverlay) {
    state.figureOverlay.visible = false;
  }
}

export const fourQuadrantsScenario = {
  id: 'FOUR_QUADRANTS',
  title: 'The 2×2 Architectural Matrix: BFO vs ISO 15926 × LPG vs RDF',
  audioSrc: './narratives/Four_Quadrants_-_Knowledge_Systems.mp3',
  fallbackDuration: 1176,
  chapters: FOUR_QUADRANTS_CHAPTERS,

  subtitles: [
    { start: 0.22, end: 2.98, text: "Welcome to the Architectural Matrix Demonstrator." },
    { start: 5.80, end: 11.08, text: "In the previous scenarios, we saw why naive, schema-free graphs collapse when" },
    { start: 11.08, end: 14.38, text: "confronted with time, history, and engineering rules." },
    { start: 15.30, end: 19.76, text: "Once an organization accepts that it needs formal semantics, the engineering" },
    { start: 19.76, end: 24.10, text: "leadership immediately faces a two-by-two architectural crossroads." },
    { start: 26.72, end: 31.56, text: "On the horizontal axis, you must choose your top-level ontological commitment at" },
    { start: 31.56, end: 33.22, text: "the SMIM layer." },
    { start: 35.30, end: 40.90, text: "Do you model the world in three dimensions using BFO, the Basic Formal Ontology," },
    { start: 41.46, end: 45.12, text: "where physical parts are enduring objects that pass through time?" },
    { start: 46.06, end: 52.62, text: "Or do you model the world in four dimensions using ISO 15926, where every" },
    { start: 52.62, end: 58.12, text: "physical object is a spatiotemporal worm sliced into immutable historical states?" },
    { start: 60.30, end: 66.02, text: "On the vertical axis, you must choose your physical graph storage mechanism at the SMS layer." },
    { start: 67.78, end: 71.247, text: "Do you deploy a labeled property graph, LPG," },
    { start: 71.247, end: 75.26, text: "where nodes and edges carry internal key-value dictionaries?" },
    { start: 76.30, end: 82.38, text: "Or do you deploy a W3C Resource Description Framework store, RDF, where" },
    { start: 82.38, end: 87.94, text: "all knowledge is decomposed into atomic binary triples governed by global URIs?" },
    { start: 90.68, end: 96.00, text: "Cross these two axes, and you get four legitimate industrial-grade architectures." },
    { start: 96.00, end: 98.00, text: "None of them is wrong." },
    { start: 98.68, end: 103.28, text: "Yet in practice, choosing the wrong quadrant for your organizational reality" },
    { start: 103.28, end: 105.64, text: "has bankrupted digital thread initiatives." },
    { start: 107.80, end: 112.78, text: "To see why, we will not drown you in hundreds of equipment classes. We will use" },
    { start: 112.78, end: 119.22, text: "our compact domain vocabulary, vehicle, functional slot, part, warehouse, and" },
    { start: 119.22, end: 123.96, text: "defect, to run a single lifecycle stress test across all four quadrants." },
    { start: 126.42, end: 128.50, text: "Let us set the stage on the canvas." },
    { start: 130.10, end: 140.78, text: "At time T equals 10, suspension arm ARM_SN_404 is registered and placed in warehouse_1." },
    { start: 142.18, end: 149.76, text: "At time T equals 20, it is removed from storage and mounted into the front suspension slot of vehicle_1." },
    { start: 150.48, end: 156.92, text: "At time T equals 50, a routine inspection logs a minor defect, a 2 millimeter crack." },
    { start: 156.92, end: 163.74, text: "Finally, at time T equals 80, the crack propagates to a critical 15" },
    { start: 163.74, end: 170.28, text: "millimeters. The arm is dismantled from vehicle_1 and returned to warehouse_1 for" },
    { start: 170.28, end: 171.68, text: "a warranty investigation." },
    { start: 174.18, end: 181.00, text: "Let us enable Show Closed History and step into quadrant one, BFO in 3D combined" },
    { start: 181.00, end: 182.48, text: "with a labeled property graph." },
    { start: 185.26, end: 188.82, text: "Look at the canvas in BFO plus LPG mode." },
    { start: 190.56, end: 194.92, text: "Why is this first quadrant the darling of internal R&D software teams?" },
    { start: 197.04, end: 199.88, text: "Because it aligns with everyday human intuition." },
    { start: 200.80, end: 207.38, text: "Vehicle_1, the functional slot, ARM_SN_404," },
    { start: 207.38, end: 214.44, text: "and warehouse_1 sit on the canvas as single permanent boxes, material entities." },
    { start: 215.48, end: 219.68, text: "Even though the suspension arm moved from the warehouse to the vehicle and back," },
    { start: 219.68, end: 224.88, text: "there is still only one node for ARM_SN_404." },
    { start: 226.94, end: 228.24, text: "Where does the history live?" },
    { start: 228.88, end: 230.48, text: "Look directly at the edges." },
    { start: 231.26, end: 236.52, text: "Because an LPG engine natively supports key-value properties on relationships, the" },
    { start: 236.52, end: 238.84, text: "temporal intervals sit right on the arrows." },
    { start: 239.50, end: 245.32, text: "Mounted_in carries valid from T20, valid to T80." },
    { start: 247.26, end: 251.06, text: "Let us evaluate quadrant one against our engineering criteria." },
    { start: 252.92, end: 256.80, text: "First, query ergonomics and computational performance." },
    { start: 258.459, end: 263.04, text: "Look at the Cypher query in the lower right panel. It is remarkably compact." },
    { start: 263.76, end: 269.08, text: "Because LPG databases use index-free adjacency, traversing from vehicle_1" },
    { start: 270.04, end: 275.04, text: "through the slot to the part and filtering by edge timestamps takes microseconds." },
    { start: 277.22, end: 280.18, text: "Second, IT and developer onboarding." },
    { start: 282.04, end: 286.64, text: "Any software engineer familiar with JSON and object-oriented programming can" },
    { start: 286.64, end: 288.58, text: "understand this graph in an afternoon." },
    { start: 291.20, end: 293.40, text: "So where does quadrant one break down?" },
    { start: 295.16, end: 298.26, text: "It hits a wall in two specific boundary cases." },
    { start: 299.84, end: 303.54, text: "Boundary case one, multi-supplier data federation." },
    { start: 305.36, end: 312.32, text: "Suppose ARM_SN_404 is manufactured by a tier-one supplier" },
    { start: 312.32, end: 318.76, text: "in Poland, assembled by an OEM in Germany, and serviced by a fleet operator in Sweden." },
    { start: 319.56, end: 327.14, text: "In an LPG database, node labels and edge properties are local strings, not globally dereferencable URIs." },
    { start: 327.96, end: 332.88, text: "When the supplier exports their internal LPG data, their property is called" },
    { start: 332.88, end: 337.24, text: "flaw_length, while your Cypher query expects crack." },
    { start: 338.04, end: 343.86, text: "There is no built-in W3C semantic layer to align vocabularies or validate schemas" },
    { start: 343.86, end: 345.14, text: "across company borders." },
    { start: 345.88, end: 350.92, text: "You end up writing brittle custom Python ETL scripts for every single supplier." },
    { start: 353.06, end: 356.92, text: "Boundary case two, state-dependent property evolution." },
    { start: 358.38, end: 361.78, text: "In BFO 3D, the part node is timeless." },
    { start: 362.516, end: 368.796, text: "When the crack grows from 2 millimeters at T50 to 15 millimeters at T80, or when the" },
    { start: 368.796, end: 372.776, text: "surface temperature of the part fluctuates, attaching those changing" },
    { start: 372.776, end: 376.476, text: "values to a single 3D continuant node becomes awkward." },
    { start: 377.176, end: 381.076, text: "You are forced to spawn separate quality nodes for every measurement episode." },
    { start: 383.636, end: 387.416, text: "To solve the cross-supplier interoperability problem while keeping our" },
    { start: 387.416, end: 392.216, text: "3D intuitive worldview, enterprises often move to quadrant two," },
    { start: 392.976, end: 397.616, text: "BFO in 3D combined with W3C RDF triples." },
    { start: 399.836, end: 403.956, text: "Watch what happens to the exact same dataset when we switch the physical" },
    { start: 403.976, end: 406.036, text: "perspective to physical RDF." },
    { start: 408.736, end: 414.996, text: "The clean 3D graph suddenly explodes into a web of yellow hexagons and white literal ovals." },
    { start: 415.756, end: 417.676, text: "Why did the graph triple in size?" },
    { start: 420.596, end: 425.376, text: "This is the classic friction between a 3D ontology and a pure triple store." },
    { start: 426.976, end: 431.694, text: "In BFO, two three-dimensional objects, the part and the slot," },
    { start: 431.694, end: 436.756, text: "are connected over a specific time window from T20 to T80." },
    { start: 438.516, end: 443.496, text: "In LPG, we simply tucked T20 and T80 inside the edge." },
    { start: 444.976, end: 451.516, text: "But in strict W3C RDF, edges are binary predicates. A predicate cannot hold" },
    { start: 451.516, end: 456.296, text: "properties. You cannot attach a timestamp to an arrow in standard RDF." },
    { start: 457.176, end: 464.136, text: "Therefore, to express ARM_SN_404 was mounted in the slot from" },
    { start: 464.136, end: 470.696, text: "T20 to T80, the database must reify the relationship. It creates an artificial" },
    { start: 470.696, end: 476.696, text: "intermediate node, an RDF statement hexagon, and fires out four separate triples:" },
    { start: 477.336, end: 479.616, text: "RDF subject pointing to the part," },
    { start: 480.296, end: 486.016, text: "RDF object pointing to the slot, valid from pointing to the integer literal 20," },
    { start: 486.536, end: 489.636, text: "and valid to pointing to the integer literal 80." },
    { start: 491.596, end: 495.096, text: "Let us score quadrant two against our operational criteria." },
    { start: 496.836, end: 497.836, text: "Where does it shine?" },
    { start: 499.436, end: 503.836, text: "In semantic governance and NATO or defense-grade standardization." },
    { start: 504.556, end: 511.196, text: "Every class, every BFO relation, and every unit of measure has a globally unique URI." },
    { start: 511.896, end: 516.536, text: "You can hand a formal OWL ontology and SHACL validation shapes to 20" },
    { start: 516.536, end: 520.776, text: "international contractors, and an automated reasoner will mathematically" },
    { start: 520.776, end: 524.976, text: "verify whether their delivered data complies with your contract before a" },
    { start: 524.976, end: 526.936, text: "single byte enters your repository." },
    { start: 529.796, end: 533.016, text: "Where does quadrant two become an operational nightmare?" },
    { start: 534.816, end: 538.016, text: "Look at the SPARQL query panel and the relationship store." },
    { start: 541.056, end: 546.356, text: "First, every time a technician logs an assembly action, the database writes five" },
    { start: 546.356, end: 548.816, text: "to six triples instead of one edge." },
    { start: 551.596, end: 558.136, text: "Second, to answer a simple temporal BOM query at time T, the query engine cannot" },
    { start: 558.136, end: 563.816, text: "simply hop from node to node. It must execute expensive relational joins across" },
    { start: 563.816, end: 567.396, text: "thousands of reified statement nodes and literal values." },
    { start: 570.136, end: 575.656, text: "Third, try explaining to a pragmatic manufacturing IT supplier why they cannot" },
    { start: 575.656, end: 581.056, text: "just send you a parent-child table and why they must instantiate blank reification" },
    { start: 581.056, end: 583.196, text: "nodes for every bolt in an assembly." },
    { start: 583.856, end: 587.596, text: "The cognitive tension with traditional IT vendors is immense." },
    { start: 590.496, end: 595.616, text: "Now, what if our engineering problem is not just tracking where a part is, but" },
    { start: 595.616, end: 600.716, text: "auditing the exact historical configuration of a complex system when a failure occurred?" },
    { start: 602.916, end: 604.656, text: "This brings us to quadrant three," },
    { start: 605.456, end: 611.276, text: "ISO 15926 in 4D combined with a labeled property graph." },
    { start: 613.016, end: 620.036, text: "Let us switch the ontology to ISO 15926 and the perspective to physical LPG." },
    { start: 622.316, end: 627.416, text: "Look closely at the topology on the canvas. The philosophical shift is radical." },
    { start: 629.056, end: 634.535, text: "In ISO 15926, the blue node, ARM_SN_404_4D," },
    { start: 634.535, end: 642.256, text: "is no longer a 3D physical piece of metal sitting on a shelf." },
    { start: 643.016, end: 644.956, text: "It is the whole life individual," },
    { start: 645.616, end: 650.576, text: "the entire four-dimensional spacetime worm of that suspension arm from the day it" },
    { start: 650.576, end: 654.236, text: "was cast in the foundry to the day it is melted down as scrap." },
    { start: 656.756, end: 663.216, text: "And notice, the 4D worm itself never participates directly in any assembly or defect." },
    { start: 665.496, end: 671.596, text: "Instead, every time reality changes, at T10 in the warehouse, at T20 in the" },
    { start: 671.596, end: 678.176, text: "vehicle, at T80 back in the warehouse, the system slices a new green or gray state" },
    { start: 678.176, end: 682.256, text: "node linked to the 4D parent via temporal part of." },
    { start: 684.676, end: 686.616, text: "Look at where the timestamps live now." },
    { start: 688.536, end: 694.976, text: "The edges, mounted_in, has_slot, stored_at," },
    { start: 695.476, end: 699.096, text: "are completely clean. They carry no timestamps at all." },
    { start: 699.716, end: 706.256, text: "Instead, the time window, T20 to T80, is an intrinsic property of the state node" },
    { start: 706.256, end: 713.216, text: "itself, and physical LPG edges called transition_to link consecutive states" },
    { start: 713.216, end: 714.736, text: "into a chronological chain." },
    { start: 716.756, end: 720.116, text: "Why would an engineering organization choose quadrant three?" },
    { start: 721.816, end: 726.576, text: "Because it makes historical state auditing and configuration management bulletproof." },
    { start: 728.844, end: 735.564, text: "In a 3D graph, if vehicle_1 undergoes 50 component swaps, reconstructing the" },
    { start: 735.564, end: 741.304, text: "exact state of the vehicle at time T50 requires evaluating overlapping intervals" },
    { start: 741.304, end: 742.624, text: "on dozens of edges." },
    { start: 743.424, end: 747.744, text: "In ISO 15926 plus LPG," },
    { start: 747.784, end: 753.369, text: "a state is an immutable first-class node. The 2 millimeter crack at T50" },
    { start: 753.369, end: 760.504, text: "is permanently bound to the specific temporal slice of ARM_SN_404 that" },
    { start: 760.504, end: 765.824, text: "existed while it was mounted in the temporal slice of vehicle_1. When the part" },
    { start: 765.824, end: 773.264, text: "moves to the warehouse at T80, a new state slice is born, linked by a direct transition_to pointer." },
    { start: 776.084, end: 781.884, text: "For an internal digital twin running on a high-performance LPG engine like Neo4j or" },
    { start: 781.884, end: 788.344, text: "Memgraph, traversing state transitions along transition_to edges is blazingly" },
    { start: 788.344, end: 792.284, text: "fast, and historical data corruption is structurally impossible." },
    { start: 795.444, end: 797.364, text: "Where does quadrant three collapse?" },
    { start: 798.864, end: 801.144, text: "Look at the node store table under the bonnet." },
    { start: 804.524, end: 807.704, text: "This is the infamous 4D state explosion." },
    { start: 809.964, end: 815.904, text: "In our tiny toy example with one vehicle, one part, and three lifecycle events, we" },
    { start: 815.904, end: 817.864, text: "already have over a dozen nodes." },
    { start: 818.664, end: 825.024, text: "Now imagine a real railway locomotive or an aircraft with 50,000 serialized parts." },
    { start: 825.864, end: 831.004, text: "Every time a maintenance technician swaps a single sensor or updates a calibration parameter," },
    { start: 831.704, end: 837.484, text: "strict 4D mereology dictates that a new temporal state slice must be created, not" },
    { start: 837.484, end: 842.444, text: "only for the sensor, but for the sub-assembly, the module, and the vehicle itself." },
    { start: 843.424, end: 849.124, text: "Within a year of fleet operation, your LPG database is flooded with tens of millions" },
    { start: 849.124, end: 850.644, text: "of historical state nodes." },
    { start: 851.344, end: 854.744, text: "Furthermore, because it is stored in a schema-light LPG," },
    { start: 855.364, end: 859.703, text: "if a junior developer forgets to close a previous state timestamp when creating a" },
    { start: 859.703, end: 865.564, text: "new slice, the 4D worm forks into parallel timelines, and there is no formal" },
    { start: 865.564, end: 868.824, text: "ontological reasoner in LPG to catch the paradox." },
    { start: 870.824, end: 873.204, text: "Finally, let us enter quadrant four," },
    { start: 874.104, end: 880.964, text: "ISO 15926 in 4D combined with W3C RDF triples." },
    { start: 882.764, end: 888.844, text: "Switch the perspective to physical RDF while staying in ISO 15926." },
    { start: 890.644, end: 891.644, text: "Look at the canvas." },
    { start: 892.384, end: 897.024, text: "This is the heavy artillery of industrial knowledge architecture, born in the" },
    { start: 897.024, end: 900.704, text: "offshore oil, gas, and nuclear engineering mega projects." },
    { start: 901.504, end: 907.684, text: "Here, every 4D whole-life individual, every temporal state slice, every defect" },
    { start: 907.684, end: 912.134, text: "classification, and every literal timestamp is decomposed" },
    { start: 912.134, end: 915.124, text: "into pure immutable W3C triples." },
    { start: 915.944, end: 924.684, text: "Notice an intriguing detail when you compare BFO plus RDF against ISO 15926 plus RDF." },
    { start: 926.804, end: 933.644, text: "In ISO 15926 plus RDF, we did not need artificial RDF colon" },
    { start: 933.724, end: 936.904, text: "statement reification nodes for our assembly relationships." },
    { start: 937.564, end: 943.764, text: "Why? Because the 4D ontology already turned time into a node, the state slice." },
    { start: 944.484, end: 951.084, text: "Therefore, attaching ISO valid from and ISO valid to as standard RDF literals" },
    { start: 951.084, end: 955.364, text: "directly to the state node is 100% native to the triple model." },
    { start: 956.084, end: 961.044, text: "The 4D ontology and the RDF triple store are mathematically made for each other." },
    { start: 963.224, end: 966.144, text: "When is quadrant four the only viable choice?" },
    { start: 967.884, end: 973.104, text: "When you are building a multi-decade, multi-consortium digital thread, such as a" },
    { start: 973.104, end: 978.204, text: "nuclear power plant, a national rail infrastructure, or a defense fleet, where" },
    { start: 978.424, end: 984.364, text: "50 tier one contractors must exchange configuration history over 40 years, long" },
    { start: 984.364, end: 988.704, text: "after today's software vendors and proprietary databases have ceased to exist." },
    { start: 989.664, end: 992.464, text: "Every state slice has a permanent URI." },
    { start: 993.424, end: 999.704, text: "Reference data libraries, RDLs, define every engineering concept globally. You" },
    { start: 999.704, end: 1004.844, text: "can merge RDF graphs from 10 different suppliers into a single repository without" },
    { start: 1004.844, end: 1009.524, text: "a single ID collision and run mathematical reasoners over the entire" },
    { start: 1009.524, end: 1011.784, text: "40-year history of every part." },
    { start: 1013.584, end: 1015.684, text: "And what is the price of quadrant four?" },
    { start: 1017.284, end: 1020.924, text: "Look at the sheer density of the diagram and the SPARQL query." },
    { start: 1023.584, end: 1027.804, text: "First, extreme cognitive and ontological maintenance cost." },
    { start: 1029.564, end: 1032.944, text: "You cannot hire regular web developers to maintain this system." },
    { start: 1033.604, end: 1038.782, text: "You need rare specialists who understand both four-dimensional mereotopology" },
    { start: 1038.782, end: 1041.144, text: "and W3C semantic web stack." },
    { start: 1041.964, end: 1046.444, text: "Explaining to a mid-sized mechanical supplier that they cannot simply report" },
    { start: 1046.444, end: 1051.764, text: "part A is in vehicle one, but must instantiate a temporal part of triple" },
    { start: 1051.764, end: 1057.184, text: "linking two spatiotemporal extents to an RDL class will stall your supply chain" },
    { start: 1057.184, end: 1061.384, text: "onboarding for months unless you build thick translation middleware for them." },
    { start: 1064.124, end: 1066.884, text: "Second, compute and query latency." },
    { start: 1068.624, end: 1074.224, text: "Even a simple bill of materials tree requires joining 4D individuals, active" },
    { start: 1074.224, end: 1079.024, text: "state slices, slot states, and literal filters across millions of triples." },
    { start: 1079.704, end: 1084.624, text: "Without aggressive caching or hybrid views, real-time operational dashboards" },
    { start: 1084.624, end: 1085.904, text: "will grind to a halt." },
    { start: 1088.764, end: 1093.924, text: "Let us return to the engineer viewpoint, SMRM, to conclude." },
    { start: 1095.144, end: 1100.204, text: "Notice that as soon as we click engineer viewpoint, all four quadrants collapse" },
    { start: 1100.204, end: 1104.444, text: "back into the exact same clean three-node engineering diagram." },
    { start: 1105.324, end: 1109.464, text: "That is the ultimate lesson of IEC 63339." },
    { start: 1110.984, end: 1115.924, text: "Your field technicians, CAD designers, and fleet operators should never be forced to" },
    { start: 1115.924, end: 1118.464, text: "suffer the complexity of your storage quadrant." },
    { start: 1120.804, end: 1125.004, text: "If you are building a fast internal engineering tracker inside one company," },
    { start: 1125.644, end: 1129.164, text: "start in quadrant one with BFO and LPG." },
    { start: 1130.044, end: 1134.344, text: "If you need strict cross-enterprise vocabulary validation and semantic" },
    { start: 1134.344, end: 1140.904, text: "reasoning over intuitive 3D concepts, choose quadrant two with BFO and RDF." },
    { start: 1141.804, end: 1146.644, text: "If you need high-speed, uncorruptible audit trails of complex state transitions" },
    { start: 1146.644, end: 1153.144, text: "inside a high-performance graph database, build in quadrant three with 4D states in LPG." },
    { start: 1153.944, end: 1159.404, text: "And if you are architecting a 30-year multi-supplier industrial ecosystem where" },
    { start: 1159.404, end: 1164.544, text: "mathematical unambiguity across organizations outweighs everything else," },
    { start: 1164.544, end: 1167.184, text: "invest in the heavy machinery of quadrant four," },
    { start: 1167.844, end: 1175.984, text: "ISO 15926 over RDF, and hide that complexity behind a clean SMRM user interface." }
  ],

  timeline: [
    // --- CHAPTER 1: INTRO & 2x2 ARCHITECTURAL CROSSROADS ---
    {
      time: 0.0,
      action: (state, renderGraph) => {
        state.eventLog.splice(0, state.eventLog.length);
        state.currentTime = 0;
        state.edgeSequence = 1;
        state.ontology = 'BFO';
        state.storage = 'LPG';
        setPerspective('SMS_LPG');
        state.graphEngine = 'MERMAID';

        // Pre-fill graph with full history so viewers see complex topology during the intro lecture
        const dummyDefId = nextSequence();
        state.eventLog.push(
          createRegisterPartEvent('Vehicle_1', 0, 'Vehicle', nextSequence()),
          createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', nextSequence()),
          createRegisterPartEvent('ARM_SN_404', 10, 'Part', nextSequence()),
          createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 10, nextSequence()),
          createDismantleEvent('ARM_SN_404', 20, nextSequence()),
          createAssembleEvent('Vehicle_1', 'ARM_SN_404', 'mounted_in', 20, nextSequence()),
          createReportDefectEvent('ARM_SN_404', 'crack', '2mm', 50, dummyDefId),
          createRevokeDefectEvent('ARM_SN_404', 'crack', 80, dummyDefId, nextSequence()),
          createReportDefectEvent('ARM_SN_404', 'crack_critical', '15mm', 80, nextSequence()),
          createDismantleEvent('ARM_SN_404', 80, nextSequence()),
          createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 80, nextSequence())
        );
        state.currentTime = 80;
        state.showHistory = true;

        if (state.qdikw) state.qdikw.active = false;
        hideSlide(state);
        clearFourQuadrantsHighlights();
        renderGraph();
      }
    },
    {
      time: 5.80,
      action: () => highlightElements(['#ctrl-onto-naive-node', '#ctrl-onto-naive-edge'], 'tour-amber-highlight')
    },
    {
      time: 15.30,
      action: (state) => {
        clearFourQuadrantsHighlights();
        showSlide(state, '00_matrix_base.png', 'The 2×2 Architectural Crossroads: Top-Level Ontology (SMIM) × Physical Graph Storage (SMS)');
      }
    },
    {
      time: 26.72,
      action: (state) => { hideSlide(state); highlightElements(['#ctrl-onto-bfo', '#ctrl-onto-iso']); }
    },
    {
      time: 35.30,
      action: (state) => { state.ontology = 'BFO'; highlightElements('#ctrl-onto-bfo', 'tour-amber-highlight'); }
    },
    {
      time: 46.06,
      action: (state) => { state.ontology = 'ISO15926'; highlightElements('#ctrl-onto-iso', 'tour-amber-highlight'); }
    },
    {
      time: 60.30,
      action: () => highlightElements(['#ctrl-view-physical-lpg', '#ctrl-view-physical-rdf'])
    },
    {
      time: 67.78,
      action: (state) => showSlide(state, '01_matrix_q1.png', 'Quadrant 1 (BFO 3D + LPG): Enduring 3D Objects with Key-Value Dictionaries on Nodes & Edges')
    },
    {
      time: 76.30,
      action: (state) => showSlide(state, '02_matrix_q2.png', 'Quadrant 2 (BFO 3D + RDF): Atomic W3C Triples Governed by Global URIs & Statement Reification')
    },
    {
      time: 90.68,
      action: (state) => showSlide(state, '03_matrix_q3.png', 'Quadrant 3 (ISO 15926 4D + LPG): Spatio-Temporal Worms & Immutable State Slices in Property Graphs')
    },
    {
      time: 95.00,
      action: (state) => showSlide(state, '04_matrix_q4.png', 'Quadrant 4 (ISO 15926 4D + RDF): Full 4D Spatio-Temporal Extents Decomposed into W3C Triples')
    },
    {
      time: 99.50,
      action: (state) => showSlide(state, '00_matrix_base.png', 'Choosing the right quadrant for your organisational reality and supply chain')
    },

    // --- CHAPTER 2: LIFECYCLE STRESS TEST (Sub-second staged UI actions) ---
    {
      // WIPE CANVAS TO START LIVE TEST
      time: 126.42,
      action: (state, renderGraph) => {
        hideSlide(state);
        state.eventLog.splice(0, state.eventLog.length);
        state.currentTime = 0;
        state.edgeSequence = 1;
        
        // Re-register basics immediately so they are there for T=10
        state.eventLog.push(
          createRegisterPartEvent('Vehicle_1', 0, 'Vehicle', nextSequence()),
          createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', nextSequence())
        );

        state.ontology = 'BFO';
        setPerspective('SMRM');
        state.showHistory = false;
        highlightElements('#biz-time-badge');
        renderGraph();
      }
    },
    {
      time: 130.10,
      action: (state, renderGraph, ui) => {
        state.currentTime = 10;
        if (ui) { ui.bizRegType.value = 'Part'; ui.bizRegId.value = 'ARM_SN_404'; }
        highlightElements(['#biz-time-badge', '#biz-reg-type', '#biz-reg-id', '#biz-reg-btn'], 'tour-amber-highlight');
      }
    },
    {
      time: 130.80,
      action: (state, renderGraph) => {
        state.eventLog.push(createRegisterPartEvent('ARM_SN_404', 10, 'Part', nextSequence()));
        renderGraph();
      }
    },
    {
      time: 134.00,
      action: (state, renderGraph, ui) => {
        if (ui) { ui.bizStorePart.value = 'ARM_SN_404'; ui.bizStoreTarget.value = 'Warehouse_1'; }
        highlightElements(['#biz-store-part', '#biz-store-target', '#biz-store-btn'], 'tour-amber-highlight');
      }
    },
    {
      time: 134.70,
      action: (state, renderGraph) => {
        state.eventLog.push(createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 10, nextSequence()));
        renderGraph();
      }
    },
    {
      time: 142.18,
      action: (state, renderGraph, ui) => {
        state.currentTime = 20;
        if (ui) ui.bizDismPart.value = 'ARM_SN_404';
        highlightElements(['#biz-time-badge', '#biz-dism-part', '#biz-dism-btn'], 'tour-amber-highlight');
      }
    },
    {
      time: 142.80,
      action: (state, renderGraph) => {
        state.eventLog.push(createDismantleEvent('ARM_SN_404', 20, nextSequence()));
        renderGraph();
      }
    },
    {
      time: 145.00,
      action: (state, renderGraph, ui) => {
        if (ui) { ui.bizInstSource.value = 'ARM_SN_404'; ui.bizInstTarget.value = 'Vehicle_1'; }
        highlightElements(['#biz-inst-source', '#biz-inst-target', '#biz-inst-btn'], 'tour-amber-highlight');
      }
    },
    {
      time: 145.70,
      action: (state, renderGraph) => {
        state.eventLog.push(createAssembleEvent('Vehicle_1', 'ARM_SN_404', 'mounted_in', 20, nextSequence()));
        renderGraph();
      }
    },
    {
      time: 150.48,
      action: (state, renderGraph, ui) => {
        state.currentTime = 50;
        if (ui) { ui.bizDefTarget.value = 'ARM_SN_404'; ui.bizDefType.value = 'crack'; ui.bizDefVal.value = '2mm'; }
        highlightElements(['#biz-time-badge', '#biz-def-target', '#biz-def-type', '#biz-def-val', '#biz-def-btn'], 'tour-amber-highlight');
      }
    },
    {
      time: 151.20,
      action: (state, renderGraph) => {
        // We inject a specific ID here so we can revoke it exactly at T=80
        state.eventLog.push(createReportDefectEvent('ARM_SN_404', 'crack', '2mm', 50, 'def_crack_2mm_id'));
        renderGraph();
      }
    },
    {
      time: 156.92,
      action: (state, renderGraph, ui) => {
        state.currentTime = 80;
        if (ui) { ui.bizDefTarget.value = 'ARM_SN_404'; ui.bizDefType.value = 'crack_critical'; ui.bizDefVal.value = '15mm'; }
        highlightElements(['#biz-time-badge', '#biz-def-type', '#biz-def-val', '#biz-def-btn'], 'tour-amber-highlight');
      }
    },
    {
      time: 157.60,
      action: (state, renderGraph) => {
        // Logically correct: REVOKE 2mm crack first, THEN report 15mm crack
        state.eventLog.push(
          createRevokeDefectEvent('ARM_SN_404', 'crack', 80, 'def_crack_2mm_id', nextSequence()),
          createReportDefectEvent('ARM_SN_404', 'crack_critical', '15mm', 80, nextSequence())
        );
        renderGraph();
      }
    },
    {
      time: 163.74,
      action: (state, renderGraph, ui) => {
        if (ui) ui.bizDismPart.value = 'ARM_SN_404';
        highlightElements(['#biz-dism-part', '#biz-dism-btn'], 'tour-amber-highlight');
        state.eventLog.push(createDismantleEvent('ARM_SN_404', 80, nextSequence()));
        renderGraph();
      }
    },
    {
      time: 166.50,
      action: (state, renderGraph, ui) => {
        if (ui) { ui.bizStorePart.value = 'ARM_SN_404'; ui.bizStoreTarget.value = 'Warehouse_1'; }
        highlightElements(['#biz-store-part', '#biz-store-target', '#biz-store-btn'], 'tour-amber-highlight');
        state.eventLog.push(createAssembleEvent('Warehouse_1', 'ARM_SN_404', 'stored_at', 80, nextSequence()));
        renderGraph();
      }
    },

    // --- CHAPTER 3: QUADRANT 1 (BFO 3D + LPG) ---
    {
      time: 174.18,
      action: (state, renderGraph) => {
        state.showHistory = true;
        state.ontology = 'BFO';
        state.storage = 'LPG';
        setPerspective('SMS_LPG');
        showSlide(state, '01_matrix_q1.png', 'Entering Quadrant 1: BFO (3D Continuants) + Labeled Property Graph (LPG)');
        renderGraph();
      }
    },
    {
      time: 185.26,
      action: (state, renderGraph) => {
        hideSlide(state);
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-physical-lpg', '#canvas-container']);
        renderGraph();
      }
    },
    {
      time: 228.88,
      action: () => highlightElements(['#canvas-container', '#storage-content'], 'tour-amber-highlight')
    },
    {
      time: 258.45,
      action: () => highlightElements('#query-content', 'tour-amber-highlight')
    },
    {
      time: 299.84,
      action: () => highlightElements('#storage-content')
    },
    {
      time: 353.06,
      action: () => highlightElements('#canvas-container', 'tour-amber-highlight')
    },

    // --- CHAPTER 4: QUADRANT 2 (BFO 3D + W3C RDF) ---
    {
      time: 383.63,
      action: (state) => {
        clearFourQuadrantsHighlights();
        showSlide(state, '02_matrix_q2.png', 'Entering Quadrant 2: BFO (3D) + W3C RDF Triples (Global URIs & Reification)');
      }
    },
    {
      time: 399.83,
      action: (state, renderGraph) => {
        hideSlide(state);
        state.ontology = 'BFO';
        state.storage = 'RDF';
        setPerspective('SMS_RDF');
        highlightElements(['#ctrl-onto-bfo', '#ctrl-view-physical-rdf'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      time: 408.73,
      action: () => highlightElements('#canvas-container', 'tour-amber-highlight')
    },
    {
      time: 534.81,
      action: () => highlightElements(['#storage-content', '#query-content'], 'tour-amber-highlight')
    },

    // --- CHAPTER 5: QUADRANT 3 (ISO 15926 4D + LPG) ---
    {
      time: 590.49,
      action: (state) => {
        clearFourQuadrantsHighlights();
        showSlide(state, '03_matrix_q3.png', 'Entering Quadrant 3: ISO 15926 (4D Space-Time Worms) + Labeled Property Graph (LPG)');
      }
    },
    {
      time: 613.01,
      action: (state, renderGraph) => {
        hideSlide(state);
        state.ontology = 'ISO15926';
        state.storage = 'LPG';
        setPerspective('SMS_LPG');
        highlightElements(['#ctrl-onto-iso', '#ctrl-view-physical-lpg'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      time: 684.67,
      action: () => highlightElements('#canvas-container', 'tour-amber-highlight')
    },
    {
      time: 798.86,
      action: () => highlightElements('#storage-content', 'tour-amber-highlight')
    },

    // --- CHAPTER 6: QUADRANT 4 (ISO 15926 4D + W3C RDF) ---
    {
      time: 870.82,
      action: (state) => {
        clearFourQuadrantsHighlights();
        showSlide(state, '04_matrix_q4.png', 'Entering Quadrant 4: ISO 15926 (4D) + W3C RDF Triples (Multi-Decade Digital Thread)');
      }
    },
    {
      time: 882.76,
      action: (state, renderGraph) => {
        hideSlide(state);
        state.ontology = 'ISO15926';
        state.storage = 'RDF';
        setPerspective('SMS_RDF');
        highlightElements(['#ctrl-onto-iso', '#ctrl-view-physical-rdf'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      time: 1017.28,
      action: () => highlightElements(['#canvas-container', '#query-content'], 'tour-amber-highlight')
    },

    // --- CHAPTER 7: IEC 63339 CONCLUSION & QUADRANT CHEAT-SHEET ---
    {
      time: 1088.76,
      action: (state, renderGraph) => {
        hideSlide(state);
        setPerspective('SMRM');
        highlightElements(['#ctrl-view-smrm', '#canvas-container'], 'tour-amber-highlight');
        renderGraph();
      }
    },
    {
      time: 1120.80,
      action: (state) => showSlide(state, '01_matrix_q1.png', 'Summary — Quadrant 1 (BFO + LPG): Fast internal R&D engineering tracker inside one company')
    },
    {
      time: 1130.04,
      action: (state) => showSlide(state, '02_matrix_q2.png', 'Summary — Quadrant 2 (BFO + RDF): Strict cross-enterprise vocabulary validation over intuitive 3D concepts')
    },
    {
      time: 1141.80,
      action: (state) => showSlide(state, '03_matrix_q3.png', 'Summary — Quadrant 3 (ISO 15926 + LPG): High-speed, uncorruptible audit trails of state transitions')
    },
    {
      time: 1153.94,
      action: (state) => showSlide(state, '04_matrix_q4.png', 'Summary — Quadrant 4 (ISO 15926 + RDF): 30-year multi-supplier ecosystem hidden behind a clean SMRM UI')
    },
    {
      time: 1173.00,
      action: (state) => hideSlide(state)
    }
  ]
};

export function resetFourQuadrantsTimeline() {
  lastExecutedStep = -1;
  clearFourQuadrantsHighlights();
}

export function onFourQuadrantsTimeUpdate(currentTime, state, renderGraph, uiRefs) {
  const steps = fourQuadrantsScenario.timeline;
  for (let i = 0; i < steps.length; i++) {
    if (currentTime >= steps[i].time && i > lastExecutedStep) {
      lastExecutedStep = i;
      steps[i].action(state, renderGraph, uiRefs);
    }
  }
}