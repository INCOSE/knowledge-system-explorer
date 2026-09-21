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
import { addPart, removeEdge } from './smrm/actions.js';
import * as bfoAdapter from './smim/bfo.js';
import * as isoAdapter from './smim/iso15926.js';
import { initVisNetwork, updateVisNetwork } from './renderers/vis-adapter.js';
import { updateMermaidNetwork } from './renderers/mermaid-adapter.js';
import { generateBomHtml } from './urmsm/bom-view.js';
import { generateLpgStorageHtml, generateLpgQuery } from './sms/lpg-generator.js';
import { generateRdfStorageHtml, generateRdfQuery } from './sms/rdf-generator.js';

const App = {
  setup() {
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

    // Active dictionary based on state
    const t = computed(() => i18n[state.settings.language]);

    // Computed views over the Event Log
    const activeEdges = computed(() => {
      return state.eventLog.filter(e => 
        e.valid_from <= state.currentTime && 
        (e.valid_to === null || e.valid_to > state.currentTime)
      );
    });

    const activeNodes = computed(() => {
      const nodes = new Set(['System_A']);
      activeEdges.value.forEach(e => { nodes.add(e.from); nodes.add(e.to); });
      return Array.from(nodes);
    });

    // The core transformation pipeline: Event Log -> Ontology -> Semantic Graph
    const semanticGraph = computed(() => {
      const eventsToProcess = showHistory.value ? state.eventLog : activeEdges.value;
      
      if (state.settings.ontology === 'BFO') {
        return bfoAdapter.generateSemanticGraph(eventsToProcess, state.nodes, state.currentTime, state.settings.storage);
      } else {
        return isoAdapter.generateSemanticGraph(eventsToProcess, state.nodes, state.currentTime, state.settings.storage);
      }
    });

    // Derived Views for the Sidebar (URMSM & SMS)
    const bomHtml = computed(() => generateBomHtml('System_A', activeEdges.value));
    
    const storageHtml = computed(() => {
      if (state.settings.storage === 'LPG') {
        return generateLpgStorageHtml(semanticGraph.value, state.settings.ontology);
      } else {
        return generateRdfStorageHtml(semanticGraph.value, state.settings.ontology);
      }
    });

    const queryHtml = computed(() => {
      if (state.settings.storage === 'LPG') {
        return generateLpgQuery(state.settings.ontology, state.currentTime);
      } else {
        return generateRdfQuery(state.settings.ontology, state.currentTime);
      }
    });

    // Watch for graph or engine changes to trigger re-renders
    watch([semanticGraph, () => state.settings.engine], () => {
      renderGraph();
    }, { deep: true });

    function renderGraph() {
      if (state.settings.engine === 'vis') {
        const isComplex = state.settings.ontology === 'ISO15926' || state.settings.storage === 'RDF';
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
      
      // Inject initial seed data
      addPart('System_A', 'SubAssembly_1');
      addPart('System_A', 'Part_A');
      addPart('SubAssembly_1', 'Sensor_X');
      
      renderGraph();
    });

    // UI Event Handlers
    function handleAdd() {
      addPart(selectedParent.value, partNameInput.value);
      partNameInput.value = '';
    }

    function handleRemove() {
      if (selectedEdgeToRemove.value) {
        removeEdge(selectedEdgeToRemove.value);
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
      state, t, layout, advanceTime,
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
          <button :class="{ active: state.settings.ontology === 'BFO' }" @click="state.settings.ontology = 'BFO'">BFO (3D)</button>
          <button :class="{ active: state.settings.ontology === 'ISO15926' }" @click="state.settings.ontology = 'ISO15926'">ISO 15926 (4D)</button>
        </div>

        <div class="divider"></div>

        <div class="section-label">
          <span class="iec-badge">IEC 63339 / SMS<span class="iec-tooltip" v-html="t.tooltips.sms"></span></span>
          <span>{{ t.graphTitle }}</span>
        </div>
        <div class="btn-group">
          <button :class="{ active: state.settings.storage === 'LPG' }" @click="state.settings.storage = 'LPG'">LPG</button>
          <button :class="{ active: state.settings.storage === 'RDF' }" @click="state.settings.storage = 'RDF'">RDF (W3C)</button>
        </div>

        <div class="divider"></div>

        <div class="section-label">🎨 <span>{{ t.engineTitle }}</span></div>
        <div class="btn-group">
          <button :class="{ active: state.settings.engine === 'vis' }" @click="state.settings.engine = 'vis'">🌐 Vis.js</button>
          <button :class="{ active: state.settings.engine === 'mermaid' }" @click="state.settings.engine = 'mermaid'">📊 Mermaid</button>
        </div>

        <div style="margin-left: auto;" class="btn-group flag-group">
          <button :class="{ active: state.settings.language === 'sv' }" @click="state.settings.language = 'sv'" title="Svenska">🇸🇪</button>
          <button :class="{ active: state.settings.language === 'en' }" @click="state.settings.language = 'en'" title="British English">🇬🇧</button>
          <button :class="{ active: state.settings.language === 'ru' }" @click="state.settings.language = 'ru'" title="Русский">🇷🇺</button>
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
        <div ref="visContainer" v-show="state.settings.engine === 'vis'" style="width: 100%; height: 100%; position: absolute;"></div>
        <div ref="mermaidContainer" v-show="state.settings.engine === 'mermaid'" id="mermaid-container"></div>
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
            <span style="color:#0284c7; font-weight: 600;">SMS / {{ state.settings.ontology }} / {{ state.settings.storage }}</span>
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
            <pre class="code-block" :style="{ color: state.settings.ontology === 'BFO' ? '#0369a1' : '#3730a3' }">{{ queryHtml }}</pre>
          </div>
        </div>
      </div>
    </div>
  `
};

createApp(App).mount('#app');