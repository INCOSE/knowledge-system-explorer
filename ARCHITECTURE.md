# Project Architecture: IEC 63339 Knowledge Architecture Workbench

## 1. Core Paradigm & Architectural Principles

The **Knowledge Architecture Workbench** is an interactive demonstrator exploring semantic ontologies, graph data models, and temporal event sourcing for systems engineering within the **IEC 63339** framework.

### Standard Nomenclature (IEC 63339)
* **URMSM:** Unified Reference Model for Smart Manufacturing (user viewpoints and specific methods).
* **SMRM:** Smart Manufacturing Reference Model (canonical domain ontology and reference model).
* **SMIM:** Smart Manufacturing Implementation Model (information elements, top-level ontologies, and semantic rules).
* **SMS:** Smart Manufacturing System (physical storage layer and concrete database representations).

### Foundational Principles
* **Buildless Vue 3:** Native ES6 modules executed directly by the browser via standard W3C `importmap`. There is no compilation, bundling, Webpack, Vite, or `package.json`. Vue components use the Composition API (`setup()`) with string templates (`template: \`...\``).
* **Event Sourcing (Single Source of Truth):** System state is modelled as an immutable, append-only temporal Event Log (`state.eventLog` in `js/state.js`). Graph nodes and edges are never directly mutated or deleted in memory; all changes occur by registering events with temporal bounds (`valid_from`, `valid_to`).
* **The Rule of Isolation:** Strict layer separation is enforced across the entire data pipeline:
  * Top-Level Ontology (TLO) adapters (`js/smim/`) are pure functions that never manipulate the DOM, interact with Vue, or invoke renderers.
  * Storage and query generators (`js/sms/`) and Viewpoints (`js/urmsm/`) never inspect `js/state.js` directly.
  * Graph renderers (`js/renderers/`) are pure painters and contain no domain or ontological logic.
  * All inter-layer coordination is strictly orchestrated through `js/app.js`.

---

## 2. End-to-End Data Pipeline Flow

The system operates via an unidirectional data pipeline from user actions down to visual and textual outputs:

```text
       User Interaction / Scenario Engine
                       │
                       ▼
         SMRM Actions (js/smrm/actions.js)
                       │ (Validates input, creates immutable events)
                       ▼
          Event Log (js/state.js: eventLog)
                       │
                       ▼
       SMIM Ontology Adapters (js/smim/bfo.js, iso15926.js, naive.js)
                       │ (Takes eventLog + currentTime -> canonical SemanticGraph)
                       ▼
       SMIM Inference Engine (js/smim/inference-engine.js)
                       │ (Evaluates rules: adds InferredStress, InferredHazard, BlindSpots)
                       ▼
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
URMSM Viewpoint Generators                                 SMS Physical Storage Layer
• bom-view.js (Hierarchical BOM tree)                      • sms-graph-generator.js (Autonomous physical canvas graph)
• smrm-view.js (Slot-collapsed Engineer View)              • lpg-generator.js (Cypher queries & LPG tables)
         │                                                 • rdf-generator.js (W3C Turtle & SPARQL queries)
         │                                                           │
         └─────────────────────────────┬─────────────────────────────┘
                                       │
                                       ▼
                       Visualisation Renderers (js/renderers/)
                       • vis-adapter.js (Interactive physics-driven canvas)
                       • mermaid-adapter.js (Declarative diagram serialisation)
```

### Storage Generator Isolation Nuance
* **Canvas Physical Graph (`sms-graph-generator.js`):** Completely autonomous. It does not import domain definitions (`smrm/definitions.js`) and constructs physical canvas nodes and edges directly from the canonical `SemanticGraph`.
* **Database Stores & Query Exporters (`lpg-generator.js`, `rdf-generator.js`):** Consume the canonical logical `SemanticGraph` (SMIM) rather than the output of `sms-graph-generator.js`. They utilize `INTERNAL_PROPERTY_KEYS` from `smrm/definitions.js` to strip internal metadata, and excise virtual inference nodes (`InferredStress`, `InferredHazard`, `WisdomDirective`, `BlindSpot`) ensuring that exported Cypher and SPARQL/Turtle scripts reflect pure, non-redundant database records.

---

## 3. Directory & Module Responsibilities

### Root & Entry Points
* `/index.html` - The single HTML entry point. Configures CDN importmaps (Vue 3, Vis.js, Mermaid, Panzoom), stylesheets, and mounts the application.
* `/styles/main.css` - Global application layout, typography, UI controls, and scenario highlighting effects.
* `/styles/Twemoji-16.0.1.ttf` - Standalone vector font ensuring consistent cross-platform emoji and status badge rendering.
* `/figures/` - Conceptual diagrams, including the DIKW pyramid (`1280px-DIKW_Pyramid.svg.webp`) and the 4-quadrant architectural matrix slides (`figures/ontologiesGraphs/`) generated via `ontologiesGraphsMatrix.py`.
* `/narratives/` - Multimedia assets including voiceover narrations (`.mp3`) and synchronised subtitle transcripts (`.srt`).

### Core Orchestration & State
* `/js/app.js` - **The Orchestrator.** Manages the Vue 3 application instance, reactive view routing, scenario player synchronisation, URL deep-linking, chapter navigation, and cross-layer pipeline orchestration.
* `/js/state.js` - **Single Source of Truth.** Hosts the reactive application state: `eventLog`, active ontology (`BFO`, `ISO15926`, `NAIVE`), perspective (`SMRM`, `SMIM`, `SMS_LPG`, `SMS_RDF`), storage mode (`LPG`, `RDF`), visual overlays (`figureOverlay`), and Q-D-I-K-W inference options.
* `/js/i18n.js` - Multilingual dictionary (British English `en`, Swedish `sv`, Russian `ru`).

### The IEC 63339 Pipeline Modules
* `/js/smrm/` (Smart Manufacturing Reference Model) - **Domain Core & Actions.**
  * `definitions.js`: Manufacturing domain vocabulary (`ENTITY_CLASSES`, `RELATION_TYPES`, `INTERNAL_PROPERTY_KEYS`, and class inference helpers).
  * `actions.js`: Validates domain intent and appends structured events (`REGISTER_PART`, `ASSEMBLE_PART`, `REPORT_DEFECT`, `REVOKE_DEFECT`, `DISMANTLE_PART`) to the Event Log.
* `/js/smim/` (Smart Manufacturing Implementation Model) - **Ontology Adapters & Semantic Inference.**
  * `bfo.js`: 3D continuant/occurrent realist adapter (`MaterialEntity`, `Quality`, `inheres_in`, temporal edge validity).
  * `iso15926.js`: 4D spatio-temporal extent adapter (`ActualIndividual`, `State`, `temporalPartOf`, atemporal structural edges).
  * `naive.js`: Unconstrained property graph representation without formal ontological constraints.
  * `inference-engine.js`: Q-D-I-K-W reasoning engine evaluating domain rules (Slot load regimes, Stress inference, Material fracture physics, Functional safety hazards, and Blind Spot detection).
* `/js/sms/` (Smart Manufacturing System) - **Physical Storage Generators.**
  * `sms-graph-generator.js`: Autonomous physical graph generator constructing visual LPG state transitions and W3C RDF statement reifications from the logical `SemanticGraph`.
  * `lpg-generator.js`: Cypher query builder and tabular database record exporter (filtering internal engine properties).
  * `rdf-generator.js`: W3C Turtle/SPARQL generator implementing explicit statement reification (`rdf:Statement`) and literal attribution.
* `/js/urmsm/` (Unified Reference Model for Smart Manufacturing) - **User Viewpoints.**
  * `bom-view.js`: Hierarchical engineering Bill of Materials generator following strict `Parent -> Slot -> Child` traversal.
  * `smrm-view.js`: ISO 42010 Engineer View reduction engine collapsing intermediate contextual `Slot` nodes into direct transitive `has_part` relationships while preserving defect nodes.
* `/js/scenarios/` - **Interactive Scenarios & Narratives.**
  * `scenario-sandbox-tour.js`: Onboarding scenario introducing UI controls, live domain actions, and multi-perspective exploration.
  * `scenario-four-quadrants.js`: Comprehensive 7-chapter narrative exploring the 2×2 matrix (BFO/15926 × LPG/RDF) with slide overlays.
  * `scenario-qdikw.js`: Demonstrates the Question-Data-Information-Knowledge-Wisdom pipeline, engineering role perspectives, and blind spot discovery.
  * `scenario-vanishing-crack.js`: Defect tracking lifecycle across temporal paradigms demonstrating the "Vanishing Crack" paradox.
* `/js/renderers/` - **Visualisation Engines.**
  * `vis-adapter.js`: Interactive canvas renderer with physics-based layout, clustering, and dynamic pan/zoom via Vis.js.
  * `mermaid-adapter.js`: Declarative text serialisation and SVG rendering engine for structural diagrams.

## 4. The Perspectives Architecture (IEC 63339)

The workbench offers four distinct perspectives (`state.perspective`):

1. **SMRM Perspective (`state.perspective = 'SMRM'`):**
   * The systems engineer viewpoint. Intermediate contextual `Slot` nodes are collapsed via `smrm-view.js` into direct `has_part` edges.
   * Defects are rendered as distinct domain nodes (`:Defect` / `:Quality`) attached via `has_defect` relationships.
   * *Note:* Defects are only flattened directly onto the transitive `has_part` relationship in the specific `NAIVE_EDGE` tutorial mode.
2. **SMIM Perspective (`state.perspective = 'SMIM'`):**
   * The canonical ontological layer preserving complete semantic fidelity.
   * Retains full intermediate topology: `Parent -> Slot -> Child`, BFO Continuants and Qualities, or ISO 15926 4D Extents and States.
3. **SMS_LPG Perspective (`state.perspective = 'SMS_LPG'`):**
   * Physical Labeled Property Graph store.
   * Properties reside directly on graph vertices and edges.
   * For ISO 15926, explicit physical `TRANSITION_TO` edges connect consecutive states of an individual over time.
4. **SMS_RDF Perspective (`state.perspective = 'SMS_RDF'`):**
   * Physical W3C Semantic Triples store (`Subject -> Predicate -> Object/Literal`).
   * Edges possess strictly zero properties. Relationship attributes, temporal bounds, and defect metadata are externalised into `rdf:Statement` reification vertices and typed `Literal` nodes.

---

## 5. Temporal Rendering Truth Table

To prevent abstraction leakage, time metadata is rendered according to a strict truth table across ontological paradigms and storage layers:

| Layer / Paradigm | Temporal Bound Placement | Structural Relationship Behaviour | Edge Property Rendering |
| :--- | :--- | :--- | :--- |
| **BFO (3D) + SMIM / LPG** | On structural relationships (`validFrom`, `validTo`) | 3D Continuants are atemporal; temporal intervals qualify their relationships | Rendered directly on edge labels as `{validFrom, validTo}` |
| **ISO 15926 (4D) + SMIM / LPG** | Inside 4D `:State` vertices | Structural edges (`temporalPartOf`, `mounted_in`) are atemporal and timestamp-free | Only `TRANSITION_TO` edges display `atTime`; structural edges remain clean |
| **Physical RDF (`SMS_RDF`)** | Inside discrete `Literal` vertices (`xsd:integer`) | Structural relationships are pure W3C URI-to-URI triples | Zero edge properties; temporal bounds are modelled via `rdf:Statement` reification |

---

## 6. The Canonical Data Contract: SemanticGraph

All `smim/` adapters and the inference engine return a standardised `SemanticGraph` object:

```javascript
{
  nodes: [
    {
      id: "st_Part_1_e1",
      label: "Part_1_State",
      type: "State", // 'MaterialEntity' | 'Quality' | 'ActualIndividual' | 'State' | 'Slot' | 'InferredStress' | 'InferredHazard' | 'WisdomDirective' | 'BlindSpot'
      properties: {
        validFrom: 0,
        validTo: null,
        isCurrent: true,
        entityClass: "Part",
        loadRegime: "EXTREME_DYNAMIC_CYCLES",
        safetyFunction: "PRIMARY_DIRECTIONAL_STABILITY"
      }
    }
  ],
  edges: [
    {
      id: "e1",
      from: "st_System_A_e1",
      to: "st_Part_1_e1",
      label: "hasPart",
      type: "composition", // 'inherence' | 'temporalPartOf' | 'transition' | 'inference'
      properties: {
        validFrom: 0,
        validTo: null,
        isCurrent: true
      }
    }
  ],
  wisdomAlerts: [
    {
      id: "ALERT_001",
      severity: "CRITICAL",
      message: "Catastrophic fracture hazard detected under active high dynamic load."
    }
  ],
  blindSpots: [
    {
      id: "BLIND_SPOT_001",
      role: "Quality Engineer",
      description: "Defect logged in isolation without functional slot load context."
    }
  ]
}
```

---

## 7. Scenario Orchestration & Multimedia Engine

The scenario engine (`js/app.js` and `js/scenarios/`) integrates interactive simulations with synchronised audiovisual narration:

* **URL Deep-Linking (`?demo=...`):**
  Deep-links allow direct launching into specific scenarios or sandbox modes (`FOUR_QUADRANTS`, `QDIKW_PIPELINE`, `VANISHING_CRACK`, `SANDBOX_TOUR`, `SANDBOX`). Direct URLs can be copied from the UI via the browser History API without page reloads.
* **Deterministic Chapter Navigation (`jumpToTime`):**
  Narrative timelines support chapter skipping with deterministic replay. When a user navigates to a chapter timestamp, the engine resets the Event Log and deterministically re-evaluates all historical actions up to the target timestamp.
* **Fallback Virtual Timer:**
  If scenario `.mp3` narration audio files are missing, fail to load, or are blocked by browser autoplay policies, the orchestrator automatically activates a 250ms fallback interval timer, preserving uninterrupted subtitle synchronisation and timeline step progression.
* **Sandbox Reset Controls (🗑️):**
  The architecture maintains a strict distinction between:
  1. *Domain Temporal Events:* `RevokeDefectEvent` and `DismantleEvent` close temporal validity (`valid_to = currentTime`) while retaining immutable historical records.
  2. *Demonstration Canvas Purges:* Physical reset actions that excise entities directly from `state.eventLog` to provide a pristine canvas during live demonstration runs.