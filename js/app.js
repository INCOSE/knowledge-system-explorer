/**
 * APPLICATION ORCHESTRATOR (Vue 3)
 * --------------------------------
 * This module serves as the entry point. It binds the reactive state
 * to the DOM, handles user inputs, and acts as the controller that 
 * passes data between the Event Log, Domain Actions, Ontologies, and Renderers.
 */

import { createApp, computed, watch, onMounted, ref, reactive, nextTick } from 'vue';
import { state, advanceTime, loadState } from './state.js';
import { i18n } from './i18n.js';
import { 
  createRegisterPartEvent, 
  createAssembleEvent, 
  createReportDefectEvent, 
  createDismantleEvent 
} from './smrm/actions.js';
import { ENTITY_CLASSES, RELATION_TYPES } from './smrm/definitions.js';
import * as bfoAdapter from './smim/bfo.js';
import * as isoAdapter from './smim/iso15926.js';
import * as naiveAdapter from './smim/naive.js';
import { initVisNetwork, updateVisNetwork } from './renderers/vis-adapter.js';
import { updateMermaidNetwork } from './renderers/mermaid-adapter.js';
import { generateBomTree } from './urmsm/bom-view.js';
import { reduceGraphForSMRM } from './urmsm/smrm-view.js';
import { generateLpgStorage, generateLpgQuery } from './sms/lpg-generator.js';
import { generateRdfStorage, generateRdfQuery } from './sms/rdf-generator.js';
import { generatePhysicalGraph } from './sms/sms-graph-generator.js';
import {
  vanishingCrackScenario,
  onTimeUpdate as dispatchScenarioTimeline,
  resetTimeline
} from './scenarios/scenario-vanishing-crack.js';

/**
 * RECURSIVE BOM TREE NODE COMPONENT
 * ---------------------------------
 * Pure Vue component for rendering hierarchical Bill of Materials nodes
 * without raw HTML strings or external DOM manipulation.
 */
const BomNode = {
  name: 'BomNode',
  props: {
    node: {
      type: Object,
      required: true
    }
  },
  template: `
    <li>
      <strong>{{ node.id }}</strong>
      <ul v-if="node.children && node.children.length > 0" class="tree">
        <bom-node
          v-for="child in node.children"
          :key="child.id"
          :node="child"
        />
      </ul>
    </li>
  `
};

const App = {
  components: {
    BomNode
  },
  setup() {
    // 1. Local UI Settings (Isolated from domain state)
    const settings = reactive({
      language: 'sv',         // Available options: 'sv', 'en', 'ru'
      ontology: 'NAIVE_NODE', // SMIM Top-Level Ontology: 'BFO' | 'ISO15926' | 'NAIVE_NODE' | 'NAIVE_EDGE'
      storage: 'LPG',         // SMS Storage Paradigm: 'LPG' or 'RDF'
      engine: 'vis',          // Renderer: 'vis' (Vis.js) or 'mermaid'
      perspective: 'SMRM'     // Perspective: 'SMRM' | 'SMIM' | 'SMS'
    });

    // User Role State ('UNI_ENGINEER')
    const userRole = ref('UNI_ENGINEER');
    watch(userRole, (newRole) => {
      state.userRole = newRole;
    });
    watch(() => state.userRole, (newRole) => {
      if (newRole && userRole.value !== newRole) {
        userRole.value = newRole;
      }
    });

    // Synchronise reactive ontology between settings and domain state
    watch(() => state.ontology, (newOnto) => {
      if (newOnto === 'ISO_15926_4D' || newOnto === 'ISO15926') {
        settings.ontology = 'ISO15926';
      } else if (newOnto === 'NAIVE_NODE') {
        settings.ontology = 'NAIVE_NODE';
      } else if (newOnto === 'NAIVE_EDGE') {
        settings.ontology = 'NAIVE_EDGE';
      } else if (newOnto === 'NAIVE') {
        settings.ontology = 'NAIVE_NODE';
      } else if (newOnto === 'BFO') {
        settings.ontology = 'BFO';
      }
    }, { immediate: true });
    watch(() => settings.ontology, (newOnto) => {
      if (state.ontology !== newOnto) {
        state.ontology = newOnto;
      }
    });

    // Synchronise perspective between settings and domain state
    watch(() => state.perspective, (newPersp) => {
      if (newPersp && settings.perspective !== newPersp) {
        settings.perspective = newPersp;
      }
    }, { immediate: true });
    watch(() => settings.perspective, (newPersp) => {
      if (state.perspective !== newPersp) {
        state.perspective = newPersp;
      }
    });

    // Synchronise engine between settings and domain state
    watch(() => state.graphEngine, (newEngine) => {
      const lower = (newEngine || 'VIS').toLowerCase();
      if (settings.engine !== lower) {
        settings.engine = lower;
      }
    }, { immediate: true });
    watch(() => settings.engine, (newEngine) => {
      const upper = (newEngine || 'vis').toUpperCase();
      if (state.graphEngine !== upper) {
        state.graphEngine = upper;
      }
    });

    // DOM References for renderers & file operations
    const visContainer = ref(null);
    const mermaidContainer = ref(null);
    const fileInput = ref(null);

    // Form inputs
    const partNameInput = ref('');
    const selectedParent = ref('System_A');
    const selectedEdgeToRemove = ref('');
    const showHistory = ref(true);

    // New Sandbox & Domain Extension Form inputs
    const selectedNodeClass = ref(ENTITY_CLASSES[0]);
    const newNodeIdInput = ref('');
    const selectedRelSource = ref('System_A');
    const selectedRelType = ref(RELATION_TYPES[0]);
    const selectedRelTarget = ref('');
    const propTargetType = ref('NODE');
    const propTargetId = ref('');
    const propKeyInput = ref('');
    const propValInput = ref('');

    // Universal Engineer Business UI inputs
    const bizRegType = ref('Vehicle');
    const bizRegId = ref('');
    const bizInstSource = ref('');
    const bizInstTarget = ref('');
    const bizDefTarget = ref('');
    const bizDefType = ref('');
    const bizDefVal = ref('');
    const bizRevDefect = ref('');
    const bizDismPart = ref('');
    const bizStorePart = ref('');
    const bizStoreTarget = ref('');

    // Scenario Player State
    const scenarioAudio = ref(null);
    const isPlaying = ref(false);
    const audioCurrentTime = ref(0);
    const audioDuration = ref(0);
    const showSubtitles = ref(true);
    const currentSubtitleText = ref('');
    const executedTimelineActions = ref(new Set());

    // Layout State (Flex percentages for resizers)
    const layout = reactive({ leftWidth: 66, bomHeight: 25, storageHeight: 40 });

    // Active dictionary based on local settings
    const t = computed(() => i18n[settings.language]);

    /**
     * Resolves the domain entity class of a node by inspecting ID conventions.
     *
     * @param {string} nodeId - Identifier of the node.
     * @returns {string} Domain entity class ('Vehicle' | 'Slot' | 'Part' | 'Defect' | 'Warehouse').
     */
    function getNodeEntityClass(nodeId) {
      if (!nodeId) return 'Part';
      if (/^veh/i.test(nodeId) || /^sys/i.test(nodeId)) return 'Vehicle';
      if (/^slot/i.test(nodeId)) return 'Slot';
      if (/^ware|^wh/i.test(nodeId)) return 'Warehouse';
      if (/^def/i.test(nodeId)) return 'Defect';
      return 'Part';
    }

    // Dynamic entity projection: Reconstruct base entities from pure business events in eventLog
    const baseNodes = computed(() => {
      const nodeMap = new Map();

      state.eventLog.forEach(event => {
        if (event.valid_from !== undefined && event.valid_from > state.currentTime) return;

        if (event.type === 'REGISTER_PART' && event.partId) {
          nodeMap.set(event.partId, {
            id: event.partId,
            label: event.partId,
            type: getNodeEntityClass(event.partId),
            entityClass: getNodeEntityClass(event.partId)
          });
        } else if (event.type === 'ASSEMBLE') {
          if (event.parentId && !nodeMap.has(event.parentId)) {
            nodeMap.set(event.parentId, {
              id: event.parentId,
              label: event.parentId,
              type: getNodeEntityClass(event.parentId),
              entityClass: getNodeEntityClass(event.parentId)
            });
          }
          if (event.childId && !nodeMap.has(event.childId)) {
            nodeMap.set(event.childId, {
              id: event.childId,
              label: event.childId,
              type: getNodeEntityClass(event.childId),
              entityClass: getNodeEntityClass(event.childId)
            });
          }
        }
      });

      return Array.from(nodeMap.values());
    });

    const availableNodes = computed(() => {
      return baseNodes.value.map(n => n.id);
    });

    const activeNodes = computed(() => {
      return availableNodes.value;
    });

    const activeEdges = computed(() => {
      return naiveAdapter.generateSemanticGraph(
        state.eventLog,
        baseNodes.value,
        state.currentTime
      ).edges.filter(e => e.properties?.isCurrent !== false);
    });

    const activeVehicles = computed(() => availableNodes.value.filter(id => getNodeEntityClass(id) === 'Vehicle'));
    const activeSlots = computed(() => availableNodes.value.filter(id => getNodeEntityClass(id) === 'Slot'));
    const activeParts = computed(() => availableNodes.value.filter(id => !id.startsWith('Slot_')));
    const activeWarehouses = computed(() => availableNodes.value.filter(id => getNodeEntityClass(id) === 'Warehouse'));

    const bizInstallSources = computed(() => {
      return availableNodes.value.filter(id => !id.startsWith('Slot_'));
    });

    const bizInstallTargets = computed(() => {
      return availableNodes.value.filter(id => !id.startsWith('Slot_'));
    });

    const installedComponents = computed(() => {
      const comps = new Set();
      activeEdges.value.forEach(e => {
        if (e.label === 'mounted_in' || e.label === 'stored_at') {
          comps.add(e.childId || e.from);
        }
      });
      return Array.from(comps).filter(id => !id.startsWith('Slot_'));
    });

    const activeDefectsList = computed(() => {
      return state.eventLog
        .map((e, index) => ({ event: e, logIndex: index }))
        .filter(({ event: e }) => e.type === 'REPORT_DEFECT' && (e.valid_to === null || e.valid_to > state.currentTime) && (e.valid_from === undefined || e.valid_from <= state.currentTime))
        .map(({ event: e, logIndex }) => {
          const id = e.id || `def_${logIndex}_${e.targetId}_${e.defectName}`;
          return {
            id,
            logIndex,
            targetId: e.targetId,
            defectName: e.defectName,
            defectValue: e.defectValue,
            label: `${e.targetId} • ${e.defectName}=${e.defectValue}`
          };
        });
    });

    watch(bizInstallSources, (sources) => {
      if (!sources.includes(bizInstSource.value)) {
        bizInstSource.value = sources[0] || '';
      }
    }, { immediate: true });

    watch(bizInstallTargets, (targets) => {
      if (!targets.includes(bizInstTarget.value)) {
        bizInstTarget.value = targets[0] || '';
      }
    }, { immediate: true });

    watch(activeParts, (parts) => {
      if (!parts.includes(bizStorePart.value)) {
        bizStorePart.value = parts[0] || '';
      }
    }, { immediate: true });

    watch(activeWarehouses, (warehouses) => {
      if (!warehouses.includes(bizStoreTarget.value)) {
        bizStoreTarget.value = warehouses[0] || '';
      }
    }, { immediate: true });

    watch(installedComponents, (comps) => {
      if (!comps.includes(bizDismPart.value)) {
        bizDismPart.value = comps[0] || '';
      }
    }, { immediate: true });

    watch(activeDefectsList, (defects) => {
      if (!defects.some(d => d.id === bizRevDefect.value)) {
        bizRevDefect.value = defects[0]?.id || '';
      }
    }, { immediate: true });

    watch(availableNodes, (nodes) => {
      if (!nodes.includes(bizDefTarget.value)) {
        bizDefTarget.value = nodes[0] || '';
      }
    }, { immediate: true });

    /**
     * Central Event Dispatcher
     * ------------------------
     * Receives domain action events, validates consistency, and mutates
     * the event log strictly according to Event Sourcing principles.
     * 
     * @param {Object} event - The domain event object to dispatch.
     */
    /**
     * Central Event Dispatcher (Pure Event Sourcing)
     * ------------------------------------------------
     * Directly appends immutable business facts to the event log.
     * 
     * @param {Object} event - The domain event object to dispatch.
     */
    function dispatch(event) {
      if (!event) return;
      state.eventLog.push(event);
    }

    // The core transformation pipeline: Event Log -> Ontology -> Semantic Graph
    const semanticGraph = computed(() => {
      const eventsToProcess = state.eventLog;
      
      if (settings.ontology === 'BFO') {
        return bfoAdapter.generateSemanticGraph(eventsToProcess, baseNodes.value, state.currentTime);
      } else if (settings.ontology === 'ISO15926') {
        return isoAdapter.generateSemanticGraph(eventsToProcess, baseNodes.value, state.currentTime);
      } else {
        return naiveAdapter.generateSemanticGraph(eventsToProcess, baseNodes.value, state.currentTime, {
          ontology: settings.ontology
        });
      }
    });

    // Derived Views for the Sidebar (URMSM & SMS)
    const bomTree = computed(() => generateBomTree('System_A', activeEdges.value));
    
    const lpgRecords = computed(() => {
      if (settings.storage === 'LPG') {
        return generateLpgStorage(semanticGraph.value);
      }
      return [];
    });

    const rdfTtl = computed(() => {
      if (settings.storage === 'RDF') {
        return generateRdfStorage(semanticGraph.value);
      }
      return '';
    });

    function formatProperties(props) {
      if (!props) return '';
      const entries = Object.entries(props).filter(([key]) => key !== 'isCurrent');
      if (entries.length === 0) return '';
      return entries.map(([k, v]) => {
        const valStr = v === null ? 'null' : (typeof v === 'number' ? `T${v}` : `'${v}'`);
        return `${k}: ${valStr}`;
      }).join(', ');
    }

    const queryCode = computed(() => {
      if (settings.storage === 'LPG') {
        return generateLpgQuery(semanticGraph.value, state.currentTime);
      } else {
        return generateRdfQuery(semanticGraph.value, state.currentTime);
      }
    });

    // Physical projection (SMS) vs Engineer View (SMRM) vs Canonical Logical (SMIM) graph routing
    const activeGraph = computed(() => {
      if (settings.perspective === 'SMS') {
        return generatePhysicalGraph(semanticGraph.value, settings.storage);
      }
      if (settings.perspective === 'SMRM') {
        return reduceGraphForSMRM(semanticGraph.value);
      }
      return semanticGraph.value;
    });

    // Reactive Graph Caption
    const graphCaption = computed(() => {
      let ontoText = 'BFO (3D)';
      if (settings.ontology === 'ISO15926') ontoText = 'ISO 15926 (4D)';
      if (settings.ontology === 'NAIVE_NODE') ontoText = t.value.ontoNaiveNode || 'Naive Graph (Node)';
      if (settings.ontology === 'NAIVE_EDGE') ontoText = t.value.ontoNaiveEdge || 'Naive Graph (Edge)';
      const storageText = settings.storage;
      let viewText = t.value.viewLogicalCaption;
      if (settings.perspective === 'SMRM') viewText = t.value.viewSmrmCaption;
      if (settings.perspective === 'SMS') viewText = t.value.viewPhysicalCaption;
      return `${ontoText} | ${storageText} | ${viewText}`;
    });

    // Contextual Dynamic Legend
    const graphLegendItems = computed(() => {
      const nodes = [];
      const edges = [];
      const dict = t.value.legend;

      if (settings.ontology === 'NAIVE_NODE' || settings.ontology === 'NAIVE_EDGE' || settings.ontology === 'NAIVE') {
        nodes.push({ id: 'naiveVehicle', label: dict.naiveVehicle, swatch: 'swatch-box-vehicle' });
        nodes.push({ id: 'naiveSlot', label: dict.naiveSlot, swatch: 'swatch-box-slot' });
        nodes.push({ id: 'naivePart', label: dict.naivePart, swatch: 'swatch-box-part' });
        nodes.push({ id: 'naiveDefect', label: dict.naiveDefect, swatch: 'swatch-diamond-defect' });
        nodes.push({ id: 'naiveWarehouse', label: dict.naiveWarehouse, swatch: 'swatch-box-warehouse' });

        edges.push({ id: 'relHasSlot', label: dict.relHasSlot, swatch: 'swatch-line-slot' });
        edges.push({ id: 'relMountedIn', label: dict.relMountedIn, swatch: 'swatch-line-mount' });
        edges.push({ id: 'relStoredAt', label: dict.relStoredAt, swatch: 'swatch-line-store' });
        edges.push({ id: 'relHasDefect', label: dict.relHasDefect, swatch: 'swatch-line-defect' });
      } else if (settings.ontology === 'BFO') {
        nodes.push({ id: 'bfoSys', label: dict.bfoSys, swatch: 'swatch-box-sys' });
        nodes.push({ id: 'bfoElem', label: dict.bfoElem, swatch: 'swatch-box-elem' });
        nodes.push({ id: 'bfoQuality', label: dict.bfoQuality, swatch: 'swatch-diamond' });

        if (settings.perspective === 'SMS' && settings.storage === 'RDF') {
          nodes.push({ id: 'rdfStmt', label: dict.rdfStmt, swatch: 'swatch-diamond' });
          nodes.push({ id: 'rdfLit', label: dict.rdfLit, swatch: 'swatch-literal' });
          edges.push({ id: 'rdfPred', label: dict.rdfPred, swatch: 'swatch-line-past' });
        } else {
          edges.push({ id: 'bfoActive', label: dict.bfoActiveEdge, swatch: 'swatch-line-active' });
          edges.push({ id: 'bfoInheres', label: dict.bfoInheres, swatch: 'swatch-line-transition' });
          if (showHistory.value) {
            edges.push({ id: 'bfoPast', label: dict.bfoPastEdge, swatch: 'swatch-line-past' });
          }
        }
      } else {
        // ISO 15926 (4D)
        nodes.push({ id: 'iso4d', label: dict.iso4d, swatch: 'swatch-box-4d' });
        nodes.push({ id: 'isoState', label: dict.isoState, swatch: 'swatch-box-state' });
        nodes.push({ id: 'isoDefect', label: dict.isoDefect, swatch: 'swatch-diamond-defect' });
        edges.push({ id: 'isoPart', label: dict.isoPartRel, swatch: 'swatch-line-active' });
        edges.push({ id: 'isoSlice', label: dict.isoSliceRel, swatch: 'swatch-line-past' });
        edges.push({ id: 'isoDefectRel', label: dict.isoDefectRel, swatch: 'swatch-line-defect' });

        if (settings.perspective === 'SMS' && settings.storage === 'LPG') {
          edges.push({ id: 'isoTrans', label: dict.isoTransitionRel, swatch: 'swatch-line-transition' });
        }
      }

      return { nodes, edges };
    });

    // Watch for graph or engine changes to trigger re-renders
    watch([activeGraph, () => settings.engine], () => {
      renderGraph();
    }, { deep: true });

    function renderGraph() {
      if (state.currentView === 'MENU') return;
      const graphToRender = activeGraph.value;
      if (settings.engine === 'vis') {
        const isComplex = settings.ontology === 'ISO15926' || settings.perspective === 'SMS';
        updateVisNetwork(graphToRender, isComplex);
      } else if (mermaidContainer.value) {
        updateMermaidNetwork(graphToRender, mermaidContainer.value);
      }
    }

    // Watch for view changes to initialise the canvas when entering the sandbox workspace
    watch(() => state.currentView, async (newView) => {
      if (newView !== 'SCENARIO') {
        stopAudio();
      }
      if (newView === 'SCENARIO') {
        userRole.value = 'UNI_ENGINEER';
        state.eventLog.length = 0;
        resetTimeline(0);
        state.currentTime = 0;
        state.ontology = 'NAIVE_NODE';
        state.perspective = 'SMRM';
        state.graphEngine = 'MERMAID';
      }
      if (newView !== 'MENU') {
        await nextTick();
        if (visContainer.value) {
          initVisNetwork(visContainer.value);
        }
        renderGraph();
      }
    });

    // Lifecycle hooks
    onMounted(() => {
      // Inject initial seed data via pure factories and central dispatcher
      dispatch(createRegisterPartEvent('System_A', state.currentTime));
      dispatch(createRegisterPartEvent('SubAssembly_1', state.currentTime));
      dispatch(createAssembleEvent('System_A', 'SubAssembly_1', 'has_part', state.currentTime));
      dispatch(createRegisterPartEvent('Part_A', state.currentTime));
      dispatch(createAssembleEvent('System_A', 'Part_A', 'has_part', state.currentTime));
      dispatch(createRegisterPartEvent('Sensor_X', state.currentTime));
      dispatch(createAssembleEvent('SubAssembly_1', 'Sensor_X', 'has_part', state.currentTime));
      
      if (state.currentView !== 'MENU' && visContainer.value) {
        initVisNetwork(visContainer.value);
        renderGraph();
      }
    });

    // UI Event Handlers
    /**
     * Resets the application state, stops audio playback, and returns to the main menu.
     */
    function goHome() {
      stopAudio();
      state.currentView = 'MENU';
      state.eventLog.splice(0, state.eventLog.length);
      state.currentTime = 0;
      state.edgeSequence = 1;
    }

    /**
     * Starts audio playback.
     */
    function playAudio() {
      if (scenarioAudio.value) {
        scenarioAudio.value.play().catch(err => {
          console.warn('Audio playback was prevented or failed:', err);
        });
      }
    }

    /**
     * Pauses audio playback.
     */
    function pauseAudio() {
      if (scenarioAudio.value) {
        scenarioAudio.value.pause();
      }
    }

    /**
     * Toggles audio playback between play and pause states.
     */
    function togglePlayAudio() {
      if (isPlaying.value) {
        pauseAudio();
      } else {
        playAudio();
      }
    }

    /**
     * Stops audio playback, resets the timeline to zero, and clears the Event Sourcing log.
     */
    function stopAudio() {
      if (scenarioAudio.value) {
        scenarioAudio.value.pause();
        scenarioAudio.value.currentTime = 0;
      }
      isPlaying.value = false;
      audioCurrentTime.value = 0;
      currentSubtitleText.value = '';

      // Reset Event Sourcing state
      state.eventLog.length = 0;
      resetTimeline(0);
      state.ontology = 'NAIVE_NODE';
      state.perspective = 'SMRM';
      state.graphEngine = 'MERMAID';
      nextTick(() => {
        renderGraph();
      });
    }

    /**
     * Synchronises reactive audio time, subtitles, and timeline graph events with HTML5 audio playback.
     */
    function onTimeUpdate() {
      if (scenarioAudio.value) {
        audioCurrentTime.value = scenarioAudio.value.currentTime;
      }

      const currentTime = audioCurrentTime.value;

      // Subtitle synchronisation
      const activeSubtitle = vanishingCrackScenario.subtitles.find(
        sub => currentTime >= sub.start && currentTime <= sub.end
      );
      currentSubtitleText.value = activeSubtitle ? activeSubtitle.text : '';

      // Scenario timeline dispatcher
      dispatchScenarioTimeline(currentTime, state, renderGraph);
    }

    /**
     * Initialises audio duration when metadata is loaded.
     */
    function onLoadedMetadata() {
      if (scenarioAudio.value) {
        audioDuration.value = scenarioAudio.value.duration || 0;
      }
    }

    /**
     * Handles completion of audio playback.
     * Crucial: On audio end, do NOT rewind or reset the state. Let the graph remain on screen!
     */
    function onAudioEnded() {
      isPlaying.value = false;
      currentSubtitleText.value = '';
    }

    /**
     * Seeks to a specific position in the audio timeline based on range input,
     * resetting and re-evaluating the Event Sourcing state up to the new timestamp.
     * 
     * @param {Event} event - The range slider input event.
     */
    function onSeek(event) {
      const targetTime = parseFloat(event.target.value);
      if (scenarioAudio.value) {
        scenarioAudio.value.currentTime = targetTime;
      }
      audioCurrentTime.value = targetTime;

      // Reset Event Sourcing state for replay
      state.eventLog.length = 0;
      resetTimeline(0);
      state.ontology = 'NAIVE_NODE';
      state.perspective = 'SMRM';
      state.graphEngine = 'MERMAID';

      // Fast-forward timeline events and update subtitles to targetTime
      onTimeUpdate();
    }

    /**
     * Formats seconds into a human-readable mm:ss format.
     * 
     * @param {number} seconds - Time duration in seconds.
     * @returns {string} Formatted time string.
     */
    function formatTime(seconds) {
      if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Universal Engineer Action 1: Register Asset
     */
    function handleBizRegister() {
      if (!bizRegId.value) return;
      const event = createRegisterPartEvent(
        bizRegId.value,
        state.currentTime
      );
      if (event) {
        dispatch(event);
        bizRegId.value = '';
      }
    }

    /**
     * Universal Engineer Action 2: Install / Assemble
     */
    function handleBizInstall() {
      if (!bizInstSource.value || !bizInstTarget.value) return;
      const childId = bizInstSource.value;
      const parentId = bizInstTarget.value;
      if (childId === parentId) return;

      const event = createAssembleEvent(
        parentId,
        childId,
        'mounted_in',
        state.currentTime
      );
      if (event) {
        dispatch(event);
      }
    }

    /**
     * Universal Engineer Action 3: Report Defect
     */
    function handleBizReportDefect() {
      if (!bizDefTarget.value || !bizDefType.value) return;
      const event = createReportDefectEvent(
        bizDefTarget.value,
        bizDefType.value,
        bizDefVal.value || 'present',
        state.currentTime
      );
      if (event) {
        dispatch(event);
        bizDefType.value = '';
        bizDefVal.value = '';
      }
    }

    /**
     * Universal Engineer Action 4: Revoke Defect
     */
    function handleBizRevokeDefect() {
      if (!bizRevDefect.value) return;
      const item = activeDefectsList.value.find(d => d.id === bizRevDefect.value);
      if (item && item.logIndex !== undefined) {
        state.eventLog.splice(item.logIndex, 1);
        bizRevDefect.value = '';
      }
    }

    /**
     * Universal Engineer Action 5: Dismantle
     */
    function handleBizDismantle() {
      if (!bizDismPart.value) return;
      const event = createDismantleEvent(
        bizDismPart.value,
        state.currentTime
      );
      if (event) {
        dispatch(event);
        bizDismPart.value = '';
      }
    }

    /**
     * Universal Engineer Action 6: Move to Storage
     */
    function handleBizStore() {
      if (!bizStorePart.value || !bizStoreTarget.value) return;
      const event = createAssembleEvent(
        bizStoreTarget.value,
        bizStorePart.value,
        'stored_at',
        state.currentTime
      );
      if (event) {
        dispatch(event);
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

    /**
     * Serialises and exports the current Event Sourcing state to a JSON file.
     */
    function saveJson() {
      const exportData = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        userRole: userRole.value,
        currentTime: state.currentTime,
        edgeSequence: state.edgeSequence,
        eventLog: JSON.parse(JSON.stringify(state.eventLog))
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workbench-state-t${state.currentTime}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    /**
     * Opens the native file dialogue for loading a saved state JSON file.
     */
    function triggerLoadJson() {
      if (fileInput.value) {
        fileInput.value.value = '';
        fileInput.value.click();
      }
    }

    /**
     * Reads, deserialises, and restores the application domain state from a JSON file.
     * 
     * @param {Event} e - HTML input change event.
     */
    function onFileLoaded(e) {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            loadState({ eventLog: parsed });
          } else if (parsed && typeof parsed === 'object') {
            loadState(parsed);
            if (parsed.userRole && (parsed.userRole === 'DB_ADMIN' || parsed.userRole === 'UNI_ENGINEER')) {
              userRole.value = parsed.userRole;
            }
          }
          nextTick(() => {
            renderGraph();
          });
        } catch (err) {
          console.error('Failed to parse state JSON:', err);
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    }

    return {
      state, settings, t, layout, advanceTime, dispatch,
      userRole, fileInput, saveJson, triggerLoadJson, onFileLoaded,
      entityClasses: ENTITY_CLASSES,
      relationTypes: RELATION_TYPES,
      availableNodes, goHome, showHistory,
      activeNodes, activeEdges,
      activeVehicles, activeSlots, activeParts, activeWarehouses,
      bizRegType, bizRegId, handleBizRegister,
      bizInstSource, bizInstTarget, handleBizInstall, bizInstallSources, bizInstallTargets,
      bizDefTarget, bizDefType, bizDefVal, handleBizReportDefect,
      bizRevDefect, handleBizRevokeDefect, activeDefectsList,
      bizDismPart, handleBizDismantle, installedComponents,
      bizStorePart, bizStoreTarget, handleBizStore,
      bomTree, lpgRecords, rdfTtl, formatProperties, queryCode,
      visContainer, mermaidContainer,
      graphCaption, graphLegendItems,
      startResizeH, startResizeV,
      scenarioAudio, isPlaying, audioCurrentTime, audioDuration,
      showSubtitles, currentSubtitleText, executedTimelineActions,
      playAudio, pauseAudio, togglePlayAudio, stopAudio,
      onTimeUpdate, onLoadedMetadata, onAudioEnded, onSeek, formatTime
    };
  },
  
  template: `
    <!-- Main Menu (Landing View) -->
    <div v-if="state.currentView === 'MENU'" class="landing-view">
      <div class="menu-card">
        <div class="menu-badge">IEC 63339 Workbench</div>
        <h1 class="menu-title">Knowledge Architecture Workbench</h1>
        <p class="menu-subtitle">Top-Level Ontologies (SMIM), Storage Paradigms (SMS) &amp; Event Sourcing</p>
        
        <div class="menu-actions">
          <button class="menu-btn menu-btn-primary" @click="state.currentView = 'SANDBOX'">
            <span class="btn-main-text">Sandbox Mode</span>
            <span class="btn-sub-text">Interactive exploration of 3D/4D ontologies &amp; temporal graph models</span>
          </button>
          
          <button class="menu-btn menu-btn-scenario" @click="state.currentView = 'SCENARIO'">
            <span class="btn-main-text">Scenario: The Vanishing Crack</span>
            <span class="btn-sub-text">Guided demonstration of temporal defect tracing across lifecycle states</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Sandbox Workspace -->
    <div v-if="state.currentView !== 'MENU'" class="sandbox-workspace">
      <div class="control-deck">
      <!-- Tier 1: Architecture Settings -->
      <div class="deck-row deck-row-top">
        <div class="section-label">
          <span class="iec-badge">IEC 63339 / SMIM<span class="iec-tooltip" v-html="t.tooltips.smim"></span></span>
          <span>{{ t.ontoTitle }}</span>
        </div>
        <div class="btn-group">
          <button id="ctrl-onto-bfo" :class="{ active: settings.ontology === 'BFO' }" @click="settings.ontology = 'BFO'">BFO (3D)</button>
          <button id="ctrl-onto-iso" :class="{ active: settings.ontology === 'ISO15926' }" @click="settings.ontology = 'ISO15926'">ISO 15926 (4D)</button>
          <button id="ctrl-onto-naive-node" :class="{ active: settings.ontology === 'NAIVE_NODE' }" @click="settings.ontology = 'NAIVE_NODE'">{{ t.ontoNaiveNode }}</button>
          <button id="ctrl-onto-naive-edge" :class="{ active: settings.ontology === 'NAIVE_EDGE' }" @click="settings.ontology = 'NAIVE_EDGE'">{{ t.ontoNaiveEdge }}</button>
        </div>

        <div class="divider"></div>

        <div class="section-label">
          <span class="iec-badge">IEC 63339 / SMS<span class="iec-tooltip" v-html="t.tooltips.sms"></span></span>
          <span>{{ t.graphTitle }}</span>
        </div>
        <div class="btn-group">
          <button id="ctrl-storage-lpg" :class="{ active: settings.storage === 'LPG' }" @click="settings.storage = 'LPG'">LPG</button>
          <button id="ctrl-storage-rdf" :class="{ active: settings.storage === 'RDF' }" @click="settings.storage = 'RDF'">RDF (W3C)</button>
        </div>

        <div class="divider"></div>

        <div class="section-label">🎨 <span>{{ t.engineTitle }}</span></div>
        <div class="btn-group">
          <button id="ctrl-engine-vis" :class="{ active: settings.engine === 'vis' }" @click="settings.engine = 'vis'">🌐 Vis.js</button>
          <button id="ctrl-engine-mermaid" :class="{ active: settings.engine === 'mermaid' }" @click="settings.engine = 'mermaid'">📊 Mermaid</button>
        </div>

        <div class="divider"></div>

        <div class="section-label">👁️ <span>{{ t.viewTitle }}</span></div>
        <div class="btn-group">
          <button id="ctrl-view-smrm" :class="{ active: settings.perspective === 'SMRM' }" @click="settings.perspective = 'SMRM'">{{ t.viewSmrm }}</button>
          <button id="ctrl-view-logical" :class="{ active: settings.perspective === 'SMIM' }" @click="settings.perspective = 'SMIM'">{{ t.viewLogical }}</button>
          <button id="ctrl-view-physical" :class="{ active: settings.perspective === 'SMS' }" @click="settings.perspective = 'SMS'">{{ t.viewPhysical }}</button>
        </div>

        <div class="divider"></div>

        <!-- JSON State Operations -->
        <button id="ctrl-save-json" class="secondary" @click="saveJson" :title="t.saveBtn">{{ t.saveBtn }}</button>
        <button id="ctrl-load-json" class="secondary" @click="triggerLoadJson" :title="t.loadBtn">{{ t.loadBtn }}</button>
        <input ref="fileInput" type="file" accept=".json" style="display: none;" @change="onFileLoaded" />

        <div style="margin-left: auto;" class="btn-group flag-group">
          <button id="ctrl-lang-sv" :class="{ active: settings.language === 'sv' }" @click="settings.language = 'sv'" title="Svenska">🇸🇪</button>
          <button id="ctrl-lang-en" :class="{ active: settings.language === 'en' }" @click="settings.language = 'en'" title="British English">🇬🇧</button>
          <button id="ctrl-lang-ru" :class="{ active: settings.language === 'ru' }" @click="settings.language = 'ru'" title="Русский">🇷🇺</button>
        </div>
      </div>

      <!-- Universal Engineer Workspace -->
      <template v-if="userRole === 'UNI_ENGINEER'">
        <!-- Row 1: Time, Register, Install, Dismantle -->
        <div class="deck-row">
          <span id="biz-time-badge" class="badge">T = {{ state.currentTime }}</span>
          <button id="biz-step-btn" @click="advanceTime">{{ t.stepBtn }}</button>

          <div class="divider"></div>

          <!-- Action 1: Register Part -->
          <label style="font-size: 11px; font-weight: 700; color: #0284c7;">1. Register Part:</label>
          <input id="biz-reg-id" type="text" v-model="bizRegId" placeholder="Part ID" style="width: 110px;">
          <button id="biz-reg-btn" class="secondary" @click="handleBizRegister">Register</button>

          <div class="divider"></div>

          <!-- Action 2: Install / Assemble -->
          <label style="font-size: 11px; font-weight: 700; color: #0284c7;">2. Install:</label>
          <select id="biz-inst-source" v-model="bizInstSource">
            <option v-for="node in bizInstallSources" :key="'src_' + node" :value="node">{{ node }}</option>
          </select>
          <select id="biz-inst-target" v-model="bizInstTarget">
            <option v-for="node in bizInstallTargets" :key="'tgt_' + node" :value="node">{{ node }}</option>
          </select>
          <button id="biz-inst-btn" class="secondary" @click="handleBizInstall">Install</button>

          <div class="divider"></div>

          <!-- Action 5: Dismantle -->
          <label style="font-size: 11px; font-weight: 700; color: #0284c7;">5. Dismantle:</label>
          <select id="biz-dism-part" v-model="bizDismPart">
            <option v-for="comp in installedComponents" :key="'comp_' + comp" :value="comp">{{ comp }}</option>
          </select>
          <button id="biz-dism-btn" class="danger" @click="handleBizDismantle">Dismantle</button>
        </div>

        <!-- Row 2: Defect, Revoke, Storage, History -->
        <div class="deck-row" style="border-top: 1px solid #f1f5f9; background: #fafafa;">
          <!-- Action 3: Report Defect -->
          <label style="font-size: 11px; font-weight: 700; color: #0284c7;">3. Defect:</label>

          <select id="biz-def-target" v-model="bizDefTarget">
            <option v-for="node in availableNodes" :key="'dn_' + node" :value="node">{{ node }}</option>
          </select>
          <input id="biz-def-type" type="text" v-model="bizDefType" placeholder="Type (e.g. crack)" style="width: 110px;">
          <input id="biz-def-val" type="text" v-model="bizDefVal" placeholder="Value (e.g. 2mm)" style="width: 80px;">
          <button id="biz-def-btn" class="secondary" @click="handleBizReportDefect">Report Defect</button>

          <div class="divider"></div>

          <!-- Action 4: Revoke Defect -->
          <label style="font-size: 11px; font-weight: 700; color: #0284c7;">4. Revoke:</label>
          <select id="biz-rev-defect" v-model="bizRevDefect">
            <option v-for="d in activeDefectsList" :key="d.id" :value="d.id">{{ d.label }}</option>
          </select>
          <button id="biz-rev-btn" class="danger" @click="handleBizRevokeDefect">Revoke</button>

          <div class="divider"></div>

          <!-- Action 6: Move to Storage -->
          <label style="font-size: 11px; font-weight: 700; color: #0284c7;">6. Storage:</label>
          <select id="biz-store-part" v-model="bizStorePart">
            <option v-for="part in activeParts" :key="'sp_' + part" :value="part">{{ part }}</option>
          </select>
          <select id="biz-store-target" v-model="bizStoreTarget">
            <option v-for="wh in activeWarehouses" :key="'sw_' + wh" :value="wh">{{ wh }}</option>
          </select>
          <button id="biz-store-btn" class="secondary" @click="handleBizStore">Store</button>

          <div class="divider"></div>

          <!-- History Checkbox -->
          <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
            <input type="checkbox" v-model="showHistory"> {{ t.history }}
          </label>
        </div>
      </template>
    </div>

    <div class="main-container">
      <div id="canvas-container" :style="{ flex: \`0 0 \${layout.leftWidth}%\` }">
        <div ref="visContainer" v-show="settings.engine === 'vis'" style="width: 100%; height: 100%; position: absolute;"></div>
        <div ref="mermaidContainer" v-show="settings.engine === 'mermaid'" id="mermaid-container"></div>

        <!-- Dynamic Graph Caption Overlay -->
        <div class="graph-caption">
          <span>📌</span>
          <span>{{ graphCaption }}</span>
        </div>

        <!-- Contextual Dynamic Legend Overlay -->
        <div class="graph-legend">
          <div class="legend-title">
            <span>{{ t.legend.title }}</span>
          </div>
          <div v-if="graphLegendItems.nodes.length > 0" class="legend-section">
            <div class="legend-section-title">{{ t.legend.nodes }}</div>
            <div v-for="item in graphLegendItems.nodes" :key="item.id" class="legend-item">
              <div :class="item.swatch"></div>
              <span>{{ item.label }}</span>
            </div>
          </div>
          <div v-if="graphLegendItems.edges.length > 0" class="legend-section">
            <div class="legend-section-title">{{ t.legend.edges }}</div>
            <div v-for="item in graphLegendItems.edges" :key="item.id" class="legend-item">
              <div :class="item.swatch"></div>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
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
          <div id="tree-container" style="overflow-y: auto;">
            <template v-if="bomTree">
              <strong>{{ bomTree.id }}</strong>
              <ul v-if="bomTree.children && bomTree.children.length > 0" class="tree">
                <bom-node v-for="child in bomTree.children" :key="child.id" :node="child" />
              </ul>
            </template>
          </div>
        </div>

        <div class="resizer-h" @mousedown="(e) => startResizeV(e, 'bomHeight', '.sidebar')"></div>

        <!-- Storage View (SMS) -->
        <div class="card" :style="{ flex: \`0 0 \${layout.storageHeight}%\` }">
          <h4>
            <span>{{ t.titleStorage }}</span>
            <span style="color:#0284c7; font-weight: 600;">SMS / {{ settings.ontology }} / {{ settings.storage }}</span>
          </h4>
          <div id="storage-content" style="overflow-y: auto; display: flex; flex-direction: column;">
            <table v-if="settings.storage === 'LPG' && lpgRecords.length > 0">
              <thead>
                <tr>
                  <th>{{ t.sourceCol }}</th>
                  <th>{{ t.targetCol }}</th>
                  <th>Type</th>
                  <th>Properties</th>
                  <th>{{ t.statusCol }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in lpgRecords" :key="row.id" :class="row.isActive ? 'active-row' : 'closed-row'">
                  <td>{{ row.from }}</td>
                  <td><strong>{{ row.to }}</strong></td>
                  <td><code>:{{ row.label }}</code></td>
                  <td>
                    <code v-if="formatProperties(row.properties)">{ {{ formatProperties(row.properties) }} }</code>
                    <span v-else>—</span>
                  </td>
                  <td>{{ row.isActive ? t.activeStatus : t.closedStatus }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else-if="settings.storage === 'LPG'" style="color: #94a3b8; padding: 8px;">
              No relationship records
            </div>
            <pre v-else class="code-block">{{ rdfTtl }}</pre>
          </div>
        </div>

        <div class="resizer-h" @mousedown="(e) => startResizeV(e, 'storageHeight', '.sidebar')"></div>

        <!-- Query Generator -->
        <div class="card" style="flex: 1;">
          <h4>
            <span>{{ t.queryTitle }}</span>
            <span style="font-weight: normal; text-transform: none; color: #0d9488;">{{ t.queryDesc }}</span>
          </h4>
          <div id="query-content" style="display: flex; flex-direction: column; flex: 1;">
            <pre class="code-block" :style="{ color: settings.ontology === 'BFO' ? '#0369a1' : '#3730a3' }">{{ queryCode }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Scenario Audio Element -->
    <audio
      ref="scenarioAudio"
      src="./narratives/Ontologies_-_Disappearing_Crack.mp3"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="onAudioEnded"
    ></audio>

    <!-- Subtitles Overlay (Scenario Mode) -->
    <div
      v-if="state.currentView === 'SCENARIO' && showSubtitles"
      class="scenario-subtitles"
    >
      {{ currentSubtitleText }}
    </div>

    <!-- Floating Scenario Player Panel -->
    <div
      v-if="state.currentView === 'SCENARIO'"
      class="scenario-player-panel"
    >
      <button
        class="player-btn"
        @click="togglePlayAudio"
        :title="isPlaying ? 'Pause' : 'Play'"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
      >
        <span v-if="isPlaying">⏸</span>
        <span v-else>▶</span>
      </button>

      <button
        class="player-btn"
        @click="stopAudio"
        title="Stop"
        aria-label="Stop"
      >
        <span>⏹</span>
      </button>

      <input
        type="range"
        class="player-progress"
        min="0"
        :max="audioDuration || 100"
        step="0.1"
        :value="audioCurrentTime"
        @input="onSeek"
        aria-label="Audio Timeline"
      />

      <span class="player-time">{{ formatTime(audioCurrentTime) }} / {{ formatTime(audioDuration) }}</span>

      <button
        class="player-btn player-btn-cc"
        :class="{ active: showSubtitles }"
        @click="showSubtitles = !showSubtitles"
        title="Toggle Subtitles"
        aria-label="Toggle Subtitles"
      >
        CC
      </button>
    </div>

    <!-- Floating Home Button -->
    <button
      v-if="state.currentView !== 'MENU'"
      class="floating-home-btn"
      @click="goHome"
      title="Return to Main Menu (Resets Sandbox)"
      aria-label="Return to Main Menu"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    </button>
  `
};

createApp(App).mount('#app');