# Project Architecture: IEC 63339 Knowledge Architecture Workbench

## 1. Core Paradigm
This is a **Buildless Vue 3** application using native ES6 modules. 
* **No Build Step:** There is no Webpack, Vite, or `package.json`. 
* **No `.vue` files:** Vue components are written directly in `.js` files using string templates and the Composition API.
* **Event Sourcing:** The system state is a temporal log of events, not a static graph of current objects.

## 2. Directory Responsibilities (The IEC 63339 Layers)

* `/index.html` - The single HTML entry point. Contains CSS links, CDN scripts, and the Vue importmap.
* `/styles/main.css` - Global stylesheets.
* `/js/app.js` - **The Orchestrator.** The Vue 3 application instance. Binds the UI to the domain logic and routes data between layers.
* `/js/state.js` - **Single Source of Truth.** Contains the reactive Event Log (`eventLog`) and base entities (`nodes`).
* `/js/i18n.js` - Internationalisation dictionaries (sv, en, ru). Use British English for the 'en' locale.

### The Pipeline Modules
* `/js/smrm/` (System Model Reference Model) - **Domain Logic & Actions.**
  * `definitions.js`: Standard manufacturing domain vocabulary (Entity Classes, Relationship Types).
  * `actions.js`: Validates user input and pushes strict Event objects to `state.js`. Never touches the UI.
* `/js/smim/` (Information Elements & Rules) - **Ontology Adapters.**
  * `bfo.js`, `iso15926.js`, `naive.js`: Pure functions. They take the Event Log and Current Time, and return a standardised `SemanticGraph` object `{ nodes: [], edges: [] }`. `naive.js` acts as an unconstrained property graph adapter without 3D/4D formalisms.
* `/js/sms/` (Data in Tool) - **Storage Generators.**
  * `sms-graph-generator.js`: Transforms the canonical `SemanticGraph` (SMIM) into a physical storage graph (SMS), implementing W3C Reification for RDF and `TRANSITION_TO` state chains for LPG.
  * `lpg-generator.js`, `rdf-generator.js`: Generate database-specific table views and queries (Cypher, SPARQL/Turtle) from the `SemanticGraph`.
* `/js/urmsm/` (Dimension & Aspect) - **User Viewpoints.**
  * `bom-view.js`: Generates the engineering Bill of Materials tree abstracting away database/ontology mechanics with strict Parent -> Slot -> Child traversal.
  * `smrm-view.js`: Transforms the canonical SMIM Semantic Graph into the SMRM Engineer View by mathematically collapsing contextual Slot nodes into direct transitive Parent -> Child relationships while preserving edge properties/defects.
* `/js/scenarios/` - **Interactive Scenarios & Narratives.**
  * `scenario-vanishing-crack.js`: Defines temporal subtitles and chronological Event Sourcing timeline actions for the "Vanishing Crack" narrative demonstration across `NAIVE_NODE`, `NAIVE_EDGE`, and `ISO15926`.
* `/js/renderers/` - **Visualisation.**
  * `vis-adapter.js`, `mermaid-adapter.js`: Pure painters. They take the `SemanticGraph` and map node/edge types to colours, shapes, and physics. `mermaid-adapter.js` serialises relationship properties directly onto edge labels.

## 3. The Perspectives Architecture (IEC 63339)
The application provides three distinct viewpoints:
1. **SMRM Perspective (`state.perspective = 'SMRM'`):** Engineering viewpoint. Contextual Slots are collapsed via `smrm-view.js`, presenting a direct part-to-part hierarchy with defects transferred to transitive edges.
2. **SMIM Perspective (`state.perspective = 'SMIM'`):** Canonical ontology layer. Preserves full ontological topology (Parent -> Slot -> Child, BFO MaterialEntity/Quality, ISO 15926 4D Extent/State).
3. **SMS Perspective (`state.perspective = 'SMS'`):** Physical database storage layer (LPG states and `TRANSITION_TO` edges, W3C RDF statement reification and literals).

## 3. The Data Contract: Semantic Graph Object
All `smim/` adapters must return an object in this format to decouple ontologies from renderers:
\`\`\`javascript
{
  nodes: [ { id: "st_Part_1_e1", label: "Part_1_State", type: "State", properties: { isCurrent: true } } ],
  edges: [ { id: "e1", from: "st_System_A_e1", to: "st_Part_1_e1", label: "hasPart", type: "composition", properties: { validFrom: 0, validTo: null, isCurrent: true } } ]
}
\`\`\`