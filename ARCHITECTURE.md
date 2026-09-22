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
  * `actions.js`: Validates user input and pushes strict Event objects to `state.js`. Never touches the UI.
* `/js/smim/` (Information Elements & Rules) - **Ontology Adapters.**
  * `bfo.js`, `iso15926.js`: Pure functions. They take the Event Log and Current Time, and return a standardised `SemanticGraph` object `{ nodes: [], edges: [] }`.
* `/js/sms/` (Data in Tool) - **Storage Generators.**
  * `lpg-generator.js`, `rdf-generator.js`: Generate database-specific table views and queries (Cypher, SPARQL/Turtle) from the `SemanticGraph`.
* `/js/urmsm/` (Dimension & Aspect) - **User Viewpoints.**
  * `bom-view.js`: Generates the engineering Bill of Materials tree abstracting away database/ontology mechanics.
* `/js/renderers/` - **Visualisation.**
  * `vis-adapter.js`, `mermaid-adapter.js`: Pure painters. They take the `SemanticGraph` and map node/edge types to colours, shapes, and physics.

## 3. The Data Contract: Semantic Graph Object
All `smim/` adapters must return an object in this format to decouple ontologies from renderers:
\`\`\`javascript
{
  nodes: [ { id: "st_Part_1_e1", label: "Part_1_State", type: "State", properties: { isCurrent: true } } ],
  edges: [ { id: "e1", from: "st_System_A_e1", to: "st_Part_1_e1", label: "hasPart", type: "composition", properties: { validFrom: 0, validTo: null, isCurrent: true } } ]
}
\`\`\`