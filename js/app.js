/**
 * APPLICATION ORCHESTRATOR (Vue 3)
 * --------------------------------
 * This module serves as the entry point. It binds the reactive state
 * to the DOM, handles user inputs, and acts as the controller that 
 * passes data between the Event Log, Domain Actions, Ontologies, and Renderers.
 */

import { createApp, computed, watch, onMounted, ref, reactive } from 'vue';
import { state, advanceTime } from './state.js';
import { i18n } from './i18n.js';
import { createAddPartEvent, createRemoveEdgeEvent } from './smrm/actions.js';
import * as bfoAdapter from './smim/bfo.js';
import * as isoAdapter from './smim/iso15926.js';
import { initVisNetwork, updateVisNetwork } from './renderers/vis-adapter.js';
import { updateMermaidNetwork } from './renderers/mermaid-adapter.js';
import { generateBomHtml } from './urmsm/bom-view.js';
import { generateLpgStorage, generateLpgQuery } from './sms/lpg-generator.js';
import { generateRdfStorage, generateRdfQuery } from './sms/rdf-generator.js';

/**
 * Renders an array of LPG relationship storage records as an HTML table.
 * Applies 'active-row' and 'closed-row' classes for temporal highlighting.
 *
 * @param {Array<Object>} rows - Array of LPG relationship records.
 * @returns {string} HTML table string.
 */
function renderLpgTable(rows) {
  if (!rows || rows.length === 0) {
    return '<div style="color: #94a3b8; padding: 8px;">No relationship records</div>';
  }

  let html = '<table><thead><tr>';
  html += '<th>Source</th><th>Target</th><th>Type</th><th>Properties</th><th>Status</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    const rowClass = row.isActive ? 'active-row' : 'closed-row';
    const statusText = row.isActive ? 'Active' : 'Closed';

    // Format relationship properties excluding the internal isCurrent flag
    const propEntries = Object.entries(row.properties || {})
      .filter(([key]) => key !== 'isCurrent');

    let propHtml = '—';
    if (propEntries.length > 0) {
      const formattedProps = propEntries.map(([k, v]) => {
        const valStr = v === null ? 'null' : (typeof v === 'number' ? `T${v}` : `'${v}'`);
        return `${k}: ${valStr}`;
      }).join(', ');
      propHtml = `<code>{ ${formattedProps} }</code>`;
    }

    html += `<tr class="${rowClass}">`;
    html += `<td>${row.from}</td>`;
    html += `<td><strong>${row.to}</strong></td>`;
    html += `<td><code>:${row.label}</code></td>`;
    html += `<td>${propHtml}</td>`;
    html += `<td>${statusText}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

const App = {
  setup() {
    // 1. Local UI Settings (Isolated from domain state)
    const settings = reactive({
      language: 'sv',         // Available options: 'sv', 'en', 'ru'
      ontology: 'BFO',        // SMIM Top-Level Ontology: 'BFO' or 'ISO15926'
      storage: 'LPG',         // SMS Storage Paradigm: 'LPG' or 'RDF'
      engine: 'vis'           // Renderer: 'vis' (Vis.js) or 'mermaid'
    });

    // DOM References for renderers
    const visContainer = ref(null);
    const mermaidContainer = ref(null);

    // Form inputs
    const partNameInput = ref('');
    const selectedParent = ref('System_A');
    const selectedEdgeToRemove = ref('');
    const showHistory = ref(true);

    // Layout State (Flex percentages for resizers)
    const layout = reactive({ leftWidth: 66, bomHeight: 25, storageHeight: 40 });

    // Active dictionary based on local settings
    const t = computed(() => i18n[settings.language]);

    // Computed views over the Event Log
    const activeEdges = computed(() => {
      return state.eventLog.filter(e => 
        e.valid_from <= state.currentTime && 
        (e.valid_to === null || e.valid_to > state.currentTime)
      );
    });

    const activeNodes = computed(() => {
      const nodes = new Set(['System_A']);
      activeEdges.value.forEach(e => {
        if (e.from) nodes.add(e.from);
        if (e.to) nodes.add(e.to);
      });
      return Array.from(nodes);
    });

    // Dynamic entity projection: Reconstruct base entities from the event log
    const baseNodes = computed(() => {
      const nodeMap = new Map();
      // Root continuant system entity
      nodeMap.set('System_A', { id: 'System_A', label: 'System_A', type: 'system' });

      const events = showHistory.value ? state.eventLog : activeEdges.value;
      events.forEach(event => {
        if (event.from && !nodeMap.has(event.from)) {
          nodeMap.set(event.from, { id: event.from, label: event.from, type: 'element' });
        }
        if (event.to && !nodeMap.has(event.to)) {
          nodeMap.set(event.to, { id: event.to, label: event.to, type: 'element' });
        }
      });

      return Array.from(nodeMap.values());
    });

    /**
     * Central Event Dispatcher
     * ------------------------
     * Receives domain action events, validates consistency, and mutates
     * the event log strictly according to Event Sourcing principles.
     * 
     * @param {Object} event - The domain event object to dispatch.
     */
    function dispatch(event) {
      if (!event) return;

      if (event.type === 'EDGE_REMOVED' || event.type === 'REMOVE_EDGE') {
        const targetEdge = state.eventLog.find(e => e.id === event.edgeId);
        if (!targetEdge) {
          console.error(`[Dispatcher] Cannot sever relation. Edge ${event.edgeId} not found.`);
          return;
        }
        if (targetEdge.valid_to !== null) {
          console.warn(`[Dispatcher] Relation ${event.edgeId} is already closed.`);
          return;
        }
        targetEdge.valid_to = event.valid_to ?? state.currentTime;
        return;
      }

      // Relationship creation event
      if (!event.id) {
        event.id = `e${state.edgeSequence++}`;
      } else {
        const match = String(event.id).match(/^e(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= state.edgeSequence) {
            state.edgeSequence = num + 1;
          }
        }
      }

      const edgeExists = state.eventLog.some(e => 
        e.from === event.from && 
        e.to === event.to && 
        e.valid_to === null
      );
      if (edgeExists) {
        console.warn(`[Dispatcher] Active edge already exists between ${event.from} and ${event.to}`);
        return;
      }

      state.eventLog.push(event);
    }

    // The core transformation pipeline: Event Log -> Ontology -> Semantic Graph
    const semanticGraph = computed(() => {
      const eventsToProcess = showHistory.value ? state.eventLog : activeEdges.value;
      
      if (settings.ontology === 'BFO') {
        return bfoAdapter.generateSemanticGraph(eventsToProcess, baseNodes.value, state.currentTime);
      } else {
        return isoAdapter.generateSemanticGraph(eventsToProcess, baseNodes.value, state.currentTime);
      }
    });

    // Derived Views for the Sidebar (URMSM & SMS)
    const bomHtml = computed(() => generateBomHtml('System_A', activeEdges.value));
    
    const storageHtml = computed(() => {
      if (settings.storage === 'LPG') {
        const records = generateLpgStorage(semanticGraph.value);
        return renderLpgTable(records);
      } else {
        const ttl = generateRdfStorage(semanticGraph.value);
        return `<pre class="code-block">${ttl}</pre>`;
      }
    });

    const queryHtml = computed(() => {
      if (settings.storage === 'LPG') {
        return generateLpgQuery(semanticGraph.value, state.currentTime);
      } else {
        return generateRdfQuery(semanticGraph.value, state.currentTime);
      }
    });

    // Watch for graph or engine changes to trigger re-renders
    watch([semanticGraph, () => settings.engine], () => {
      renderGraph();
    }, { deep: true });

    function renderGraph() {
      if (settings.engine === 'vis') {
        const isComplex = settings.ontology === 'ISO15926' || settings.storage === 'RDF';
        updateVisNetwork(semanticGraph.value, isComplex);
      } else if (mermaidContainer.value) {
        updateMermaidNetwork(semanticGraph.value, mermaidContainer.value);
      }
    }

    // Lifecycle hooks
    onMounted(() => {
      if (visContainer.value) {
        initVisNetwork(visContainer.value);
      }
      
      // Inject initial seed data via pure factories and central dispatcher
      dispatch(createAddPartEvent('System_A', 'SubAssembly_1', state.currentTime, state.edgeSequence, state.eventLog));
      dispatch(createAddPartEvent('System_A', 'Part_A', state.currentTime, state.edgeSequence, state.eventLog));
      dispatch(createAddPartEvent('SubAssembly_1', 'Sensor_X', state.currentTime, state.edgeSequence, state.eventLog));
      
      renderGraph();
    });

    // UI Event Handlers
    function handleAdd() {
      const event = createAddPartEvent(
        selectedParent.value,
        partNameInput.value,
        state.currentTime,
        state.edgeSequence,
        state.eventLog
      );
      if (event) {
        dispatch(event);
        partNameInput.value = '';
      }
    }

    function handleRemove() {
      if (selectedEdgeToRemove.value) {
        const event = createRemoveEdgeEvent(
          selectedEdgeToRemove.value,
          state.currentTime,
          state.eventLog
        );
        if (event) {
          dispatch(event);
        }
      }
    }

    // Resizer Logic (Vue way)
    function startResizeH(e) {
      const startX = e.clientX;
      const startWidth = layout.leftWidth;
      const containerWidth = document.querySelector('.main-container').getBoundingClientRect().width;
      
      const onMouseMove = (evt) => {
        const newWidth = startWidth + ((evt.clientX - startX) / containerWidth) * 100;
        if (newWidth > 20 && newWidth < 80) layout.leftWidth = newWidth;
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.classList.remove('no-select');
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.classList.add('no-select');
    }

    function startResizeV(e, property, containerSelector) {
      const startY = e.clientY;
      const startHeight = layout[property];
      const containerHeight = document.querySelector(containerSelector).getBoundingClientRect().height;
      
      const onMouseMove = (evt) => {
        const newHeight = startHeight + ((evt.clientY - startY) / containerHeight) * 100;
        if (newHeight > 10 && newHeight < 80) layout[property] = newHeight;
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.classList.remove('no-select');
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.classList.add('no-select');
    }

    return {
      state, settings, t, layout, advanceTime, dispatch,
      handleAdd, handleRemove,
      partNameInput, selectedParent, selectedEdgeToRemove, showHistory,
      activeNodes, activeEdges,
      bomHtml, storageHtml, queryHtml,
      visContainer, mermaidContainer,
      startResizeH, startResizeV
    };
  },
  
  template: `
    <div class="control-deck">
      <!-- Tier 1: Architecture Settings -->
      <div class="deck-row deck-row-top">
        <div class="section-label">
          <span class="iec-badge">IEC 63339 / SMIM<span class="iec-tooltip" v-html="t.tooltips.smim"></span></span>
          <span>{{ t.ontoTitle }}</span>
        </div>
        <div class="btn-group">
          <button :class="{ active: settings.ontology === 'BFO' }" @click="settings.ontology = 'BFO'">BFO (3D)</button>
          <button :class="{ active: settings.ontology === 'ISO15926' }" @click="settings.ontology = 'ISO15926'">ISO 15926 (4D)</button>
        </div>

        <div class="divider"></div>

        <div class="section-label">
          <span class="iec-badge">IEC 63339 / SMS<span class="iec-tooltip" v-html="t.tooltips.sms"></span></span>
          <span>{{ t.graphTitle }}</span>
        </div>
        <div class="btn-group">
          <button :class="{ active: settings.storage === 'LPG' }" @click="settings.storage = 'LPG'">LPG</button>
          <button :class="{ active: settings.storage === 'RDF' }" @click="settings.storage = 'RDF'">RDF (W3C)</button>
        </div>

        <div class="divider"></div>

        <div class="section-label">🎨 <span>{{ t.engineTitle }}</span></div>
        <div class="btn-group">
          <button :class="{ active: settings.engine === 'vis' }" @click="settings.engine = 'vis'">🌐 Vis.js</button>
          <button :class="{ active: settings.engine === 'mermaid' }" @click="settings.engine = 'mermaid'">📊 Mermaid</button>
        </div>

        <div style="margin-left: auto;" class="btn-group flag-group">
          <button :class="{ active: settings.language === 'sv' }" @click="settings.language = 'sv'" title="Svenska">🇸🇪</button>
          <button :class="{ active: settings.language === 'en' }" @click="settings.language = 'en'" title="British English">🇬🇧</button>
          <button :class="{ active: settings.language === 'ru' }" @click="settings.language = 'ru'" title="Русский">🇷🇺</button>
        </div>
      </div>

      <!-- Tier 2: Operations -->
      <div class="deck-row">
        <span class="badge">T = {{ state.currentTime }}</span>
        <button @click="advanceTime">{{ t.stepBtn }}</button>

        <div class="divider"></div>

        <span class="iec-badge" style="background: #f1f5f9; color: #475569; border-color: #cbd5e1;">
          IEC 63339 / SMRM: <span style="font-weight: normal; margin-left: 3px;">{{ t.smrmStatus }}</span>
          <span class="iec-tooltip" v-html="t.tooltips.smrm"></span>
        </span>

        <div class="divider"></div>

        <label style="font-size: 11px; font-weight: 600;">{{ t.parent }}</label>
        <select v-model="selectedParent">
          <option v-for="node in activeNodes" :key="node" :value="node">{{ node }}</option>
        </select>
        
        <input type="text" v-model="partNameInput" :placeholder="t.partPlaceholder" style="width: 120px;">
        <button class="secondary" @click="handleAdd">{{ t.addBtn }}</button>
        
        <div class="divider"></div>
        <select v-model="selectedEdgeToRemove">
          <option v-for="edge in activeEdges" :key="edge.id" :value="edge.id">
            {{ edge.from }} → {{ edge.to }}
          </option>
        </select>
        <button class="danger" @click="handleRemove">{{ t.removeBtn }}</button>

        <div class="divider"></div>

        <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
          <input type="checkbox" v-model="showHistory"> {{ t.history }}
        </label>
      </div>
    </div>

    <div class="main-container">
      <div id="canvas-container" :style="{ flex: \`0 0 \${layout.leftWidth}%\` }">
        <div ref="visContainer" v-show="settings.engine === 'vis'" style="width: 100%; height: 100%; position: absolute;"></div>
        <div ref="mermaidContainer" v-show="settings.engine === 'mermaid'" id="mermaid-container"></div>
      </div>
      
      <!-- Horizontal Resizer -->
      <div class="resizer" id="panel-resizer" @mousedown="startResizeH"></div>
      
      <div class="sidebar" style="flex: 1;">
        <!-- BOM View (URMSM) -->
        <div class="card" :style="{ flex: \`0 0 \${layout.bomHeight}%\` }">
          <h4>
            <span>{{ t.titleBom }}</span>
            <span class="iec-badge align-right">IEC 63339 / URMSM<span class="iec-tooltip" v-html="t.tooltips.urmsm"></span></span>
          </h4>
          <div id="tree-container" style="overflow-y: auto;" v-html="bomHtml"></div>
        </div>

        <div class="resizer-h" @mousedown="(e) => startResizeV(e, 'bomHeight', '.sidebar')"></div>

        <!-- Storage View (SMS) -->
        <div class="card" :style="{ flex: \`0 0 \${layout.storageHeight}%\` }">
          <h4>
            <span>{{ t.titleStorage }}</span>
            <span style="color:#0284c7; font-weight: 600;">SMS / {{ settings.ontology }} / {{ settings.storage }}</span>
          </h4>
          <div id="storage-content" style="overflow-y: auto; display: flex; flex-direction: column;" v-html="storageHtml"></div>
        </div>

        <div class="resizer-h" @mousedown="(e) => startResizeV(e, 'storageHeight', '.sidebar')"></div>

        <!-- Query Generator -->
        <div class="card" style="flex: 1;">
          <h4>
            <span>{{ t.queryTitle }}</span>
            <span style="font-weight: normal; text-transform: none; color: #0d9488;">{{ t.queryDesc }}</span>
          </h4>
          <div id="query-content" style="display: flex; flex-direction: column; flex: 1;">
            <pre class="code-block" :style="{ color: settings.ontology === 'BFO' ? '#0369a1' : '#3730a3' }">{{ queryHtml }}</pre>
          </div>
        </div>
      </div>
    </div>
  `
};

createApp(App).mount('#app');