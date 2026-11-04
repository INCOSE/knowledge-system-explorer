# IEC 63339 Knowledge Architecture Workbench

An interactive sandbox demonstrator exploring top-level semantic ontologies, graph data representations, and temporal event sourcing in systems engineering based on the **IEC 63339** framework.

🔗 **Live Application:** [https://incose.github.io/knowledge-system-explorer/](https://incose.github.io/knowledge-system-explorer/)

---

## Overview

The **Knowledge Architecture Workbench** allows systems engineers and ontologists to inspect how physical and functional domain models (assemblies, functional slots, defects, and temporal states) translate across foundational upper ontologies and database paradigms:

* **Foundational Ontologies (SMIM Layer):**
  * **BFO (Basic Formal Ontology):** 3D continuant/occurrent realist perspective.
  * **ISO 15926:** 4D spatio-temporal extent and temporal part/state lifecycle ontology.
  * **Naive Graph:** Unconstrained property graph representation without formal ontological constraints.
* **Storage Representations (SMS Layer):**
  * **Labeled Property Graphs (LPG):** Explicit node/edge states connected via `TRANSITION_TO` chains.
  * **W3C Semantic Triples (RDF/OWL):** Standard statement reification and SPARQL/Turtle generation.
* **Engineering Perspectives (IEC 63339 Layers):**
  * **SMRM (System Model Reference Model):** Collapsed engineering bill of materials and functional relationships.
  * **SMIM (Semantic Information Model):** Canonical ontological topology preserving full semantic fidelity.
  * **SMS (System Model Storage):** Exact physical database layout in the underlying store.

---

## Architecture & Core Paradigms

* **Buildless Vue 3:** Written in native ES6 modules using browser-standard `importmap`. Zero compilers, bundlers, Webpack, or Vite (`no build step`, no `package.json`).
* **Event Sourcing:** The system state is modelled as an append-only reactive event log (`state.js`) rather than a mutable in-place graph.
* **Decoupled Semantic Contract:** Ontological adapters generate a standardised canonical `SemanticGraph` (`{ nodes: [], edges: [] }`) consumed by visual renderers (`vis-network` and `mermaid`).
* **Multimedia Narratives:** Interactive scenarios accompanied by synchronised audio commentaries and subtitled walkthroughs.

---

## Repository Structure

```text
.
├── index.html                               # Application entry point (CDN importmap & mounts)
├── ARCHITECTURE.md                          # IEC 63339 layer definitions & data contracts
├── README.md                                # Project documentation
├── .clinerules                              # Project development guidelines & rules
│
├── figures/                                 # Conceptual diagrams & matrix figures
│   ├── ontologiesGraphs/                    # 4-quadrant matrix graphics
│   └── 1280px-DIKW_Pyramid.svg.webp         # DIKW pyramid illustration
│
├── js/
│   ├── app.js                               # Root Vue 3 orchestrator
│   ├── state.js                             # Single Source of Truth (Event log & reactive state)
│   ├── i18n.js                              # Multilingual dictionary (en, ru, sv)
│   │
│   ├── renderers/                           # Graph visualisation engines
│   │   ├── mermaid-adapter.js               # Text-based & diagrammatic Mermaid serialization
│   │   └── vis-adapter.js                   # Interactive physics-driven graph canvas (Vis.js)
│   │
│   ├── scenarios/                           # Interactive narrative engines
│   │   ├── scenario-four-quadrants.js       # 4-quadrant comparative matrix walkthrough
│   │   ├── scenario-qdikw.js                # Q-DIKW epistemological model demonstration
│   │   ├── scenario-sandbox-tour.js         # Interactive user onboarding & controls tour
│   │   └── scenario-vanishing-crack.js      # Temporal defect tracking ("Vanishing Crack")
│   │
│   ├── smim/                                # Semantic Information Model (Ontology Adapters)
│   │   ├── bfo.js                           # Basic Formal Ontology 3D adapter
│   │   ├── inference-engine.js              # Semantic rule execution & type deduction
│   │   ├── iso15926.js                      # ISO 15926 4D extent & lifecycle adapter
│   │   └── naive.js                         # Unconstrained property graph adapter
│   │
│   ├── smrm/                                # System Model Reference Model (Domain Core)
│   │   ├── actions.js                       # Domain event generation & validation
│   │   └── definitions.js                   # Canonical domain vocabulary & entity classes
│   │
│   ├── sms/                                 # System Model Storage (Storage Generators)
│   │   ├── lpg-generator.js                 # Cypher queries & LPG structure generator
│   │   ├── rdf-generator.js                 # Turtle/SPARQL triples & reification builder
│   │   └── sms-graph-generator.js           # Physical database graph transformation
│   │
│   └── urmsm/                               # User Role Model & Specific Methods (Viewpoints)
│       ├── bom-view.js                      # Hierarchical engineering Bill of Materials
│       ├── query-intents.js                 # Domain query templates & extraction intents
│       ├── scenarios.js                     # Scenario orchestration registry
│       └── smrm-view.js                     # Collapsed engineer viewpoint generator
│
├── narratives/                              # Educational media & synchronised tracks
│   ├── ElevenLabs_Sandbox_Introduction_eng.srt
│   ├── Four_Quadrants_-_Knowledge_Systems.mp3
│   ├── Four_Quadrants_-_Knowledge_Systems_eng.srt
│   ├── General_QDIKW.mp3
│   ├── General_QDIKW_eng.srt
│   ├── Ontologies_-_Disappearing_Crack.mp3
│   ├── Ontologies_-_Disappearing_Crack.srt
│   └── Ontologies_-_Sandbox_Tour.mp3
│
└── styles/
    ├── main.css                             # Application styling & layout
    └── Twemoji-16.0.1.ttf                   # Standalone typography & emoji support

```

## Local Development

Because this project runs purely as a buildless static web application, no installation or compilation is required.

Run a lightweight static HTTP server from the root directory:

```bash
# Python 3
python -m http.server 8000

# Or using Node.js npx
npx http-server . -p 8000

```