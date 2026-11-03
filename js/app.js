/**
 * APPLICATION ORCHESTRATOR (Vue 3)
 * --------------------------------
 * Binds the single reactive state to the DOM, handles user inputs, and routes
 * data between the Event Log, Domain Actions, Ontologies (SMIM), Storage (SMS),
 * Viewpoints (URMSM), and Renderers.
 */

import { createApp, computed, watch, onMounted, ref, reactive, nextTick } from 'vue';
import { state, advanceTime, loadState, setPerspective, nextSequence } from './state.js';
import { i18n } from './i18n.js';
import {
  createRegisterPartEvent,
  createAssembleEvent,
  createReportDefectEvent,
  createRevokeDefectEvent,
  createDismantleEvent
} from './smrm/actions.js';
import { ENTITY_CLASSES, RELATION_TYPES, INTERNAL_PROPERTY_KEYS, inferEntityClass } from './smrm/definitions.js';
import * as bfoAdapter from './smim/bfo.js';
import * as isoAdapter from './smim/iso15926.js';
import * as naiveAdapter from './smim/naive.js';
import { applyQdikwInference } from './smim/inference-engine.js';
import { initVisNetwork, updateVisNetwork } from './renderers/vis-adapter.js';
import { updateMermaidNetwork } from './renderers/mermaid-adapter.js';
import { generateBomTrees } from './urmsm/bom-view.js';
import { reduceGraphForSMRM } from './urmsm/smrm-view.js';
import {
  generateLpgNodeStorage,
  generateLpgStorage,
  generateLpgQuery,
  evaluateLiveQuery
} from './sms/lpg-generator.js';
import { generateRdfStorage, generateRdfQuery } from './sms/rdf-generator.js';
import { generatePhysicalGraph } from './sms/sms-graph-generator.js';
import {
  vanishingCrackScenario,
  onTimeUpdate as dispatchVanishingCrackTimeline,
  resetTimeline as resetVanishingCrackTimeline
} from './scenarios/scenario-vanishing-crack.js';
import {
  sandboxTourScenario,
  onSandboxTourTimeUpdate,
  resetSandboxTourTimeline
} from './scenarios/scenario-sandbox-tour.js';
import {
  qdikwScenario,
  QDIKW_STAGE_TIMESTAMPS,
  onQdikwTimeUpdate,
  resetQdikwTimeline
} from './scenarios/scenario-qdikw.js';

const BomNode = {
  name: 'BomNode',
  props: {
    node: { type: Object, required: true }
  },
  template: `
    <li>
      <span class="bom-node-row">
        <strong>{{ node.id }}</strong>
        <span class="bom-class-badge">{{ node.entityClass }}</span>
        <span v-for="def in (node.defects || [])" :key="def" class="bom-defect-badge">⚠️ {{ def }}</span>
      </span>
      <ul v-if="node.children && node.children.length > 0" class="tree">
        <bom-node v-for="child in node.children" :key="child.id" :node="child" />
      </ul>
    </li>
  `
};

const App = {
  components: { BomNode },
  setup() {
    const visContainer = ref(null);
    const mermaidContainer = ref(null);
    const fileInput = ref(null);

    // Business UI inputs
    const bizRegType = ref('Part');
    const bizRegId = ref('');
    const bizInstSource = ref('');
    const bizInstTarget = ref('');
    const bizDefTarget = ref('');
    const bizDefType = ref('');
    const bizDefVal = ref('');
    const bizRevDefect = ref('');
    const bizDismPart = ref('');
    const bizDeleteNodeId = ref('');
    const bizStorePart = ref('');
    const bizStoreTarget = ref('');

    // Scenario Player State
    const activeScenarioId = ref('QDIKW_PIPELINE');
    const scenarioAudio = ref(null);
    const isPlaying = ref(false);
    const audioCurrentTime = ref(0);
    const audioDuration = ref(0);
    const showSubtitles = ref(true);
    const currentSubtitleText = ref('');
    let virtualTimerInterval = null;
    const usingVirtualTimer = ref(false);

    const activeScenarioObj = computed(() => {
      if (activeScenarioId.value === 'SANDBOX_TOUR') return sandboxTourScenario;
      if (activeScenarioId.value === 'QDIKW_PIPELINE') return qdikwScenario;
      return vanishingCrackScenario;
    });

    const activeAudioSrc = computed(() => activeScenarioObj.value.audioSrc);
    const layout = reactive({ leftWidth: 64, bomHeight: 24, storageHeight: 42 });
    const t = computed(() => i18n[state.language] || i18n.en);

    const baseNodes = computed(() => {
      const nodeMap = new Map();
      state.eventLog.forEach(event => {
        if (event.valid_from !== undefined && event.valid_from > state.currentTime) return;
        if (event.type === 'REGISTER_PART' && event.partId) {
          const cls = inferEntityClass(event.partId, event.entityClass);
          nodeMap.set(event.partId, { id: event.partId, label: event.partId, type: cls, entityClass: cls });
        } else if (event.type === 'ASSEMBLE') {
          if (event.parentId && !nodeMap.has(event.parentId)) {
            const pCls = inferEntityClass(event.parentId);
            nodeMap.set(event.parentId, { id: event.parentId, label: event.parentId, type: pCls, entityClass: pCls });
          }
          if (event.childId && !nodeMap.has(event.childId)) {
            const cCls = inferEntityClass(event.childId);
            nodeMap.set(event.childId, { id: event.childId, label: event.childId, type: cCls, entityClass: cCls });
          }
        }
      });
      return Array.from(nodeMap.values());
    });

    const availableNodes = computed(() => baseNodes.value.map(n => n.id));
    const activeParts = computed(() => baseNodes.value.filter(n => n.entityClass !== 'Slot' && n.entityClass !== 'Warehouse').map(n => n.id));
    const activeWarehouses = computed(() => baseNodes.value.filter(n => n.entityClass === 'Warehouse').map(n => n.id));
    const bizInstallSources = computed(() => baseNodes.value.filter(n => n.entityClass === 'Part').map(n => n.id));
    const bizInstallTargets = computed(() => baseNodes.value.filter(n => n.entityClass === 'Vehicle' || n.entityClass === 'Part' || n.entityClass === 'Slot').map(n => n.id));

    function dispatch(event) {
      if (!event) return;
      state.eventLog.push(event);
    }

    const semanticGraph = computed(() => {
      const opts = { ontology: state.ontology, showHistory: state.showHistory };
      let rawGraph;
      if (state.ontology === 'BFO') {
        rawGraph = bfoAdapter.generateSemanticGraph(state.eventLog, baseNodes.value, state.currentTime, opts);
      } else if (state.ontology === 'ISO15926') {
        rawGraph = isoAdapter.generateSemanticGraph(state.eventLog, baseNodes.value, state.currentTime, opts);
      } else {
        rawGraph = naiveAdapter.generateSemanticGraph(state.eventLog, baseNodes.value, state.currentTime, opts);
      }
      return applyQdikwInference(rawGraph, state);
    });

    const smrmReducedGraph = computed(() => reduceGraphForSMRM(semanticGraph.value));

    const installedComponents = computed(() => {
      const comps = new Set();
      smrmReducedGraph.value.edges.forEach(e => {
        if (e.properties?.isCurrent === false) return;
        if (e.label === 'has_part') comps.add(e.to);
        else if (e.label === 'mounted_in' || e.label === 'stored_at') comps.add(e.from);
      });
      return Array.from(comps).filter(id => !id.startsWith('Slot_'));
    });

    const activeDefectsList = computed(() => {
      const activeMap = new Map();
      state.eventLog.forEach((e, index) => {
        if (e.valid_from !== undefined && e.valid_from > state.currentTime) return;
        if (e.type === 'REPORT_DEFECT') {
          if (e.valid_to !== null && e.valid_to !== undefined && e.valid_to <= state.currentTime) return;
          const key = `${e.targetId}::${e.defectName}`;
          activeMap.set(key, {
            id: e.id || `def_${index}_${e.targetId}_${e.defectName}`,
            logIndex: index,
            targetId: e.targetId,
            defectName: e.defectName,
            defectValue: e.defectValue,
            label: `${e.targetId} • ${e.defectName}=${e.defectValue}`
          });
        } else if (e.type === 'REVOKE_DEFECT') {
          const key = `${e.targetId}::${e.defectName}`;
          activeMap.delete(key);
        }
      });
      return Array.from(activeMap.values());
    });

    watch(bizInstallSources, (sources) => { if (!sources.includes(bizInstSource.value)) bizInstSource.value = sources[0] || ''; }, { immediate: true });
    watch(bizInstallTargets, (targets) => { if (!targets.includes(bizInstTarget.value)) bizInstTarget.value = targets[0] || ''; }, { immediate: true });
    watch(activeParts, (parts) => { if (!parts.includes(bizStorePart.value)) bizStorePart.value = parts[0] || ''; }, { immediate: true });
    watch(activeWarehouses, (warehouses) => { if (!warehouses.includes(bizStoreTarget.value)) bizStoreTarget.value = warehouses[0] || ''; }, { immediate: true });
    watch(installedComponents, (comps) => { if (!comps.includes(bizDismPart.value)) bizDismPart.value = comps[0] || ''; }, { immediate: true });
    watch(activeDefectsList, (defects) => { if (!defects.some(d => d.id === bizRevDefect.value)) bizRevDefect.value = defects[0]?.id || ''; }, { immediate: true });
    watch(availableNodes, (nodes) => {
      if (!nodes.includes(bizDefTarget.value)) bizDefTarget.value = nodes[0] || '';
      if (!nodes.includes(bizDeleteNodeId.value)) bizDeleteNodeId.value = nodes[0] || '';
    }, { immediate: true });

    const bomTrees = computed(() => generateBomTrees(semanticGraph.value));
    const lpgNodeRecords = computed(() => state.storage === 'LPG' ? generateLpgNodeStorage(semanticGraph.value) : []);
    const lpgRecords = computed(() => state.storage === 'LPG' ? generateLpgStorage(semanticGraph.value) : []);
    const rdfTtl = computed(() => state.storage === 'RDF' ? generateRdfStorage(semanticGraph.value) : '');

    function formatProperties(props) {
      if (!props) return '';
      const entries = Object.entries(props).filter(
        ([key, val]) => !INTERNAL_PROPERTY_KEYS.includes(key) || key === 'validFrom' || key === 'validTo' || key === 'atTime'
          ? (key !== 'isCurrent' && val !== undefined) : false
      );
      if (entries.length === 0) return '';
      return entries.map(([k, v]) => {
        const valStr = v === null ? 'null' : (typeof v === 'number' ? `T${v}` : `'${v}'`);
        return `${k}: ${valStr}`;
      }).join(', ');
    }

    const queryCode = computed(() => {
      if (state.storage === 'LPG') return generateLpgQuery(semanticGraph.value, state.currentTime, state.ontology);
      return generateRdfQuery(semanticGraph.value, state.currentTime, state.ontology);
    });

    const liveQueryResult = computed(() => evaluateLiveQuery(semanticGraph.value, state.currentTime, state.ontology));

    const activeGraph = computed(() => {
      if (state.perspective === 'SMS_LPG') return generatePhysicalGraph(semanticGraph.value, 'LPG');
      if (state.perspective === 'SMS_RDF') return generatePhysicalGraph(semanticGraph.value, 'RDF');
      if (state.perspective === 'SMRM') return smrmReducedGraph.value;
      return semanticGraph.value;
    });

    const graphCaption = computed(() => {
      let ontoText = 'BFO (3D)';
      if (state.ontology === 'ISO15926') ontoText = 'ISO 15926 (4D)';
      if (state.ontology === 'NAIVE_NODE') ontoText = t.value.ontoNaiveNode;
      if (state.ontology === 'NAIVE_EDGE') ontoText = t.value.ontoNaiveEdge;
      let viewText = t.value.viewLogicalCaption;
      if (state.perspective === 'SMRM') viewText = t.value.viewSmrmCaption;
      if (state.perspective === 'SMS_LPG') viewText = t.value.viewPhysicalLpgCaption;
      if (state.perspective === 'SMS_RDF') viewText = t.value.viewPhysicalRdfCaption;
      return `${ontoText} | ${viewText}`;
    });

    const graphLegendItems = computed(() => {
      const nodes = []; const edges = []; const dict = t.value.legend;

      if (state.perspective === 'SMRM' || state.ontology === 'NAIVE_NODE' || state.ontology === 'NAIVE_EDGE') {
        nodes.push({ id: 'naiveVehicle', label: dict.naiveVehicle, swatch: 'swatch-box-vehicle' });
        if (state.perspective !== 'SMRM') nodes.push({ id: 'naiveSlot', label: dict.naiveSlot, swatch: 'swatch-box-slot' });
        nodes.push({ id: 'naivePart', label: dict.naivePart, swatch: 'swatch-box-part' });
        nodes.push({ id: 'naiveDefect', label: dict.naiveDefect, swatch: 'swatch-diamond-defect' });
        nodes.push({ id: 'naiveWarehouse', label: dict.naiveWarehouse, swatch: 'swatch-box-warehouse' });
        if (state.perspective === 'SMS_RDF') {
          nodes.push({ id: 'rdfStmt', label: dict.rdfStmt, swatch: 'swatch-diamond' });
          nodes.push({ id: 'rdfLit', label: dict.rdfLit, swatch: 'swatch-literal' });
          edges.push({ id: 'rdfPred', label: dict.rdfPred, swatch: 'swatch-line-past' });
        } else {
          if (state.perspective !== 'SMRM') edges.push({ id: 'relHasSlot', label: dict.relHasSlot, swatch: 'swatch-line-slot' });
          edges.push({ id: 'relMountedIn', label: dict.relMountedIn, swatch: 'swatch-line-mount' });
          edges.push({ id: 'relStoredAt', label: dict.relStoredAt, swatch: 'swatch-line-store' });
          edges.push({ id: 'relHasDefect', label: dict.relHasDefect, swatch: 'swatch-line-defect' });
        }
      } else if (state.ontology === 'BFO') {
        nodes.push({ id: 'bfoSys', label: dict.bfoSys, swatch: 'swatch-box-sys' });
        nodes.push({ id: 'bfoElem', label: dict.bfoElem, swatch: 'swatch-box-elem' });
        nodes.push({ id: 'bfoSlot', label: dict.bfoSlot || 'BFO:Site (Functional Slot)', swatch: 'swatch-box-slot' });
        nodes.push({ id: 'bfoQuality', label: dict.bfoQuality, swatch: 'swatch-diamond' });
        if (state.perspective === 'SMS_RDF') {
          nodes.push({ id: 'rdfStmt', label: dict.rdfStmt, swatch: 'swatch-diamond' });
          nodes.push({ id: 'rdfLit', label: dict.rdfLit, swatch: 'swatch-literal' });
          edges.push({ id: 'rdfPred', label: dict.rdfPred, swatch: 'swatch-line-past' });
        } else {
          edges.push({ id: 'bfoActive', label: dict.bfoActiveEdge, swatch: 'swatch-line-active' });
          edges.push({ id: 'bfoInheres', label: dict.bfoInheres, swatch: 'swatch-line-transition' });
          if (state.showHistory) edges.push({ id: 'bfoPast', label: dict.bfoPastEdge, swatch: 'swatch-line-past' });
        }
      } else {
        nodes.push({ id: 'iso4d', label: dict.iso4d, swatch: 'swatch-box-4d' });
        nodes.push({ id: 'isoState', label: dict.isoState, swatch: 'swatch-box-state' });
        nodes.push({ id: 'isoDefect', label: dict.isoDefect, swatch: 'swatch-diamond-defect' });
        if (state.perspective === 'SMS_RDF') nodes.push({ id: 'rdfLit', label: dict.rdfLit, swatch: 'swatch-literal' });
        edges.push({ id: 'isoPart', label: dict.isoPartRel, swatch: 'swatch-line-active' });
        edges.push({ id: 'isoSlice', label: dict.isoSliceRel, swatch: 'swatch-line-past' });
        edges.push({ id: 'isoDefectRel', label: dict.isoDefectRel, swatch: 'swatch-line-defect' });
        if (state.perspective === 'SMS_LPG') edges.push({ id: 'isoTrans', label: dict.isoTransitionRel, swatch: 'swatch-line-transition' });
      }

      // Dynamic Legend Additions for Distinct Inferred Knowledge & Wisdom Nodes
      const gNodes = activeGraph.value.nodes || [];
      const gEdges = activeGraph.value.edges || [];

      if (gNodes.some(n => n.type === 'InferredStress')) {
        nodes.push({ id: 'leg_inf_stress', label: dict.infStress, swatch: 'swatch-inf-stress' });
      }
      if (gNodes.some(n => n.type === 'InferredHazard')) {
        nodes.push({ id: 'leg_inf_hazard', label: dict.infHazard, swatch: 'swatch-inf-hazard' });
      }
      if (gNodes.some(n => n.type === 'WisdomDirective')) {
        nodes.push({ id: 'leg_wisdom_dir', label: dict.wisdomDir, swatch: 'swatch-wisdom-dir' });
      }
      if (gNodes.some(n => n.type === 'BlindSpot')) {
        nodes.push({ id: 'leg_blind_spot', label: dict.blindSpot, swatch: 'swatch-blind-spot' });
      }
      if (gEdges.some(e => e.type === 'inference')) {
        edges.push({ id: 'leg_inf_edge', label: dict.infEdge, swatch: 'swatch-line-inference' });
      }

      return { nodes, edges };
    });

    watch([activeGraph, () => state.graphEngine], () => { renderGraph(); }, { deep: true });

    function renderGraph() {
      if (state.currentView === 'MENU') return;
      const graphToRender = activeGraph.value;
      if (state.graphEngine === 'VIS') {
        const isComplex = state.ontology === 'ISO15926' || state.perspective.startsWith('SMS_');
        updateVisNetwork(graphToRender, isComplex);
      } else if (mermaidContainer.value) {
        updateMermaidNetwork(graphToRender, mermaidContainer.value);
      }
    }

    function seedInitialSandboxData() {
      state.eventLog.splice(0, state.eventLog.length);
      state.currentTime = 0;
      state.edgeSequence = 1;
      state.qdikw.active = false;
      state.figureOverlay.visible = false;
      dispatch(createRegisterPartEvent('System_A', 0, 'Vehicle', nextSequence()));
      dispatch(createRegisterPartEvent('SubAssembly_1', 0, 'Part', nextSequence()));
      dispatch(createAssembleEvent('System_A', 'SubAssembly_1', 'mounted_in', 0, nextSequence()));
      dispatch(createRegisterPartEvent('Part_A', 0, 'Part', nextSequence()));
      dispatch(createAssembleEvent('System_A', 'Part_A', 'mounted_in', 0, nextSequence()));
      dispatch(createRegisterPartEvent('Sensor_X', 0, 'Part', nextSequence()));
      dispatch(createAssembleEvent('SubAssembly_1', 'Sensor_X', 'mounted_in', 0, nextSequence()));
      dispatch(createRegisterPartEvent('Warehouse_1', 0, 'Warehouse', nextSequence()));
    }

    function resetActiveScenarioState() {
      state.userRole = 'UNI_ENGINEER';
      state.eventLog.splice(0, state.eventLog.length);
      state.currentTime = 0;
      state.ontology = 'NAIVE_NODE';
      state.qdikw.active = false;
      state.figureOverlay.visible = false;

      if (activeScenarioId.value === 'SANDBOX_TOUR') {
        resetSandboxTourTimeline(0);
        setPerspective('SMRM');
        state.graphEngine = 'MERMAID';
        audioDuration.value = sandboxTourScenario.fallbackDuration;
        onSandboxTourTimeUpdate(0, state, renderGraph);
      } else if (activeScenarioId.value === 'QDIKW_PIPELINE') {
        resetQdikwTimeline(0);
        setPerspective('SMRM');
        state.graphEngine = 'MERMAID';
        audioDuration.value = qdikwScenario.fallbackDuration;
        onQdikwTimeUpdate(0, state, renderGraph, null);
      } else {
        resetVanishingCrackTimeline(0);
        setPerspective('SMIM');
        state.graphEngine = 'MERMAID';
      }
    }

    function launchScenario(scenarioId) {
      activeScenarioId.value = scenarioId;
      stopAudio(false);
      if (state.currentView === 'SCENARIO') {
        resetActiveScenarioState();
        nextTick(() => renderGraph());
      } else {
        state.currentView = 'SCENARIO';
      }
    }

    function jumpToQdikwStage(stageKey) {
      const targetTime = QDIKW_STAGE_TIMESTAMPS[stageKey];
      if (targetTime === undefined) return;
      if (scenarioAudio.value && !usingVirtualTimer.value) {
        scenarioAudio.value.currentTime = targetTime;
      }
      audioCurrentTime.value = targetTime;
      resetActiveScenarioState();
      processTimelineAt(targetTime);
    }

    function toggleSlotRegime() {
      if (!state.qdikw.slotMetadata.SLOT_FRONT_SUSPENSION) {
        state.qdikw.slotMetadata.SLOT_FRONT_SUSPENSION = { loadRegime: 'DYNAMIC_CYCLIC', safetyFunction: 'STEERING_CONTROL' };
      } else {
        const cur = state.qdikw.slotMetadata.SLOT_FRONT_SUSPENSION.loadRegime;
        state.qdikw.slotMetadata.SLOT_FRONT_SUSPENSION.loadRegime = cur === 'DYNAMIC_CYCLIC' ? 'STATIC_LOAD' : 'DYNAMIC_CYCLIC';
      }
      renderGraph();
    }

    watch(() => state.currentView, async (newView) => {
      if (newView !== 'SCENARIO') stopAudio(false);
      if (newView === 'SCENARIO') {
        resetActiveScenarioState();
      } else if (newView === 'SANDBOX' && state.eventLog.length === 0) {
        seedInitialSandboxData();
      }
      if (newView !== 'MENU') {
        await nextTick();
        if (visContainer.value) initVisNetwork(visContainer.value);
        renderGraph();
      }
    });

    onMounted(() => {
      seedInitialSandboxData();
      if (state.currentView !== 'MENU' && visContainer.value) {
        initVisNetwork(visContainer.value);
        renderGraph();
      }
    });

    function clearVirtualTimer() {
      if (virtualTimerInterval) { clearInterval(virtualTimerInterval); virtualTimerInterval = null; }
    }

    function startVirtualTimer() {
      clearVirtualTimer();
      usingVirtualTimer.value = true;
      isPlaying.value = true;
      if (!audioDuration.value) audioDuration.value = activeScenarioObj.value.fallbackDuration || 108;

      virtualTimerInterval = setInterval(() => {
        if (audioCurrentTime.value < audioDuration.value) {
          audioCurrentTime.value = Math.min(audioDuration.value, audioCurrentTime.value + 0.25);
          processTimelineAt(audioCurrentTime.value);
        } else {
          clearVirtualTimer();
          onAudioEnded();
        }
      }, 250);
    }

    function goHome() {
      stopAudio(false);
      state.currentView = 'MENU';
      state.qdikw.active = false;
      state.figureOverlay.visible = false;
      state.eventLog.splice(0, state.eventLog.length);
      state.currentTime = 0;
      state.edgeSequence = 1;
    }

    function playAudio() {
      if (usingVirtualTimer.value) { startVirtualTimer(); return; }
      if (scenarioAudio.value) {
        scenarioAudio.value.play().catch(() => { startVirtualTimer(); });
      } else {
        startVirtualTimer();
      }
    }

    function pauseAudio() {
      clearVirtualTimer();
      isPlaying.value = false;
      if (scenarioAudio.value && !usingVirtualTimer.value) scenarioAudio.value.pause();
    }

    function togglePlayAudio() {
      if (isPlaying.value) pauseAudio(); else playAudio();
    }

    function stopAudio(resetScenarioGraph = true) {
      clearVirtualTimer();
      usingVirtualTimer.value = false;
      if (scenarioAudio.value) {
        scenarioAudio.value.pause();
        scenarioAudio.value.currentTime = 0;
      }
      isPlaying.value = false;
      audioCurrentTime.value = 0;
      currentSubtitleText.value = '';

      if (activeScenarioId.value === 'SANDBOX_TOUR') resetSandboxTourTimeline(0);
      else if (activeScenarioId.value === 'QDIKW_PIPELINE') resetQdikwTimeline(0);

      if (resetScenarioGraph) {
        resetActiveScenarioState();
        nextTick(() => { renderGraph(); });
      }
    }

    function processTimelineAt(currentTime) {
      const scenario = activeScenarioObj.value;
      const activeSubtitle = scenario.subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);
      currentSubtitleText.value = activeSubtitle ? activeSubtitle.text : '';

      const uiRefs = {
        bizRegType, bizRegId, bizInstSource, bizInstTarget, bizDefTarget, bizDefType, bizDefVal
      };

      if (activeScenarioId.value === 'SANDBOX_TOUR') {
        onSandboxTourTimeUpdate(currentTime, state, renderGraph);
      } else if (activeScenarioId.value === 'QDIKW_PIPELINE') {
        onQdikwTimeUpdate(currentTime, state, renderGraph, uiRefs);
      } else {
        dispatchVanishingCrackTimeline(currentTime, state, renderGraph);
      }
    }

    function onTimeUpdate() {
      if (usingVirtualTimer.value) return;
      if (scenarioAudio.value) audioCurrentTime.value = scenarioAudio.value.currentTime;
      processTimelineAt(audioCurrentTime.value);
    }

    function onLoadedMetadata() {
      if (scenarioAudio.value && scenarioAudio.value.duration) {
        usingVirtualTimer.value = false;
        audioDuration.value = scenarioAudio.value.duration;
      }
    }

    function onAudioEnded() {
      clearVirtualTimer();
      isPlaying.value = false;
      currentSubtitleText.value = '';
    }

    function onSeek(event) {
      const targetTime = parseFloat(event.target.value);
      if (scenarioAudio.value && !usingVirtualTimer.value) scenarioAudio.value.currentTime = targetTime;
      audioCurrentTime.value = targetTime;
      resetActiveScenarioState();
      processTimelineAt(targetTime);
    }

    function formatTime(seconds) {
      if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function handleBizRegister() {
      if (!bizRegId.value) return;
      const event = createRegisterPartEvent(bizRegId.value, state.currentTime, bizRegType.value, nextSequence());
      if (event) { dispatch(event); bizRegId.value = ''; }
    }

    function handleBizInstall() {
      if (!bizInstSource.value || !bizInstTarget.value) return;
      if (bizInstSource.value === bizInstTarget.value) return;
      if (installedComponents.value.includes(bizInstSource.value)) {
        dispatch(createDismantleEvent(bizInstSource.value, state.currentTime, nextSequence()));
      }
      const event = createAssembleEvent(bizInstTarget.value, bizInstSource.value, 'mounted_in', state.currentTime, nextSequence());
      if (event) dispatch(event);
    }

    function handleBizReportDefect() {
      if (!bizDefTarget.value || !bizDefType.value) return;
      const event = createReportDefectEvent(bizDefTarget.value, bizDefType.value, bizDefVal.value || 'present', state.currentTime, nextSequence());
      if (event) { dispatch(event); bizDefType.value = ''; bizDefVal.value = ''; }
    }

    function handleBizRevokeDefect() {
      if (!bizRevDefect.value) return;
      const item = activeDefectsList.value.find(d => d.id === bizRevDefect.value);
      if (item) {
        const event = createRevokeDefectEvent(item.targetId, item.defectName, state.currentTime, item.id, nextSequence());
        if (event) { dispatch(event); bizRevDefect.value = ''; }
      }
    }

    function handleBizDeleteDefect() {
      if (!bizRevDefect.value) return;
      const item = activeDefectsList.value.find(d => d.id === bizRevDefect.value);
      if (item) {
        for (let i = state.eventLog.length - 1; i >= 0; i--) {
          const ev = state.eventLog[i];
          if ((ev.type === 'REPORT_DEFECT' || ev.type === 'REVOKE_DEFECT') &&
              ev.targetId === item.targetId &&
              ev.defectName === item.defectName) {
            state.eventLog.splice(i, 1);
          }
        }
        bizRevDefect.value = '';
        renderGraph();
      }
    }

    function handleBizDismantle() {
      if (!bizDismPart.value) return;
      const event = createDismantleEvent(bizDismPart.value, state.currentTime, nextSequence());
      if (event) { dispatch(event); bizDismPart.value = ''; }
    }

    function handleBizDeleteNode() {
      const target = bizDeleteNodeId.value;
      if (!target) return;
      for (let i = state.eventLog.length - 1; i >= 0; i--) {
        const ev = state.eventLog[i];
        if (ev.partId === target || ev.parentId === target || ev.childId === target || ev.targetId === target) {
          state.eventLog.splice(i, 1);
        }
      }
      renderGraph();
    }

    function handleBizStore() {
      if (!bizStorePart.value || !bizStoreTarget.value) return;
      if (installedComponents.value.includes(bizStorePart.value)) {
        dispatch(createDismantleEvent(bizStorePart.value, state.currentTime, nextSequence()));
      }
      const event = createAssembleEvent(bizStoreTarget.value, bizStorePart.value, 'stored_at', state.currentTime, nextSequence());
      if (event) dispatch(event);
    }

    function startResizeH(e) {
      const resizerEl = e.currentTarget; resizerEl?.classList.add('dragging');
      const startX = e.clientX; const startWidth = layout.leftWidth;
      const containerWidth = document.querySelector('.main-container').getBoundingClientRect().width;
      const onMouseMove = (evt) => {
        const newWidth = startWidth + ((evt.clientX - startX) / containerWidth) * 100;
        if (newWidth > 25 && newWidth < 78) layout.leftWidth = newWidth;
      };
      const onMouseUp = () => {
        resizerEl?.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp);
        document.body.classList.remove('no-select');
      };
      document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
      document.body.classList.add('no-select');
    }

    function startResizeV(e, property, containerSelector) {
      const resizerEl = e.currentTarget; resizerEl?.classList.add('dragging');
      const startY = e.clientY; const startHeight = layout[property];
      const containerHeight = document.querySelector(containerSelector).getBoundingClientRect().height;
      const onMouseMove = (evt) => {
        const newHeight = startHeight + ((evt.clientY - startY) / containerHeight) * 100;
        if (newHeight > 12 && newHeight < 75) layout[property] = newHeight;
      };
      const onMouseUp = () => {
        resizerEl?.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp);
        document.body.classList.remove('no-select');
      };
      document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
      document.body.classList.add('no-select');
    }

    function saveJson() {
      const exportData = {
        version: '2.0', savedAt: new Date().toISOString(), userRole: state.userRole, ontology: state.ontology,
        perspective: state.perspective, storage: state.storage, graphEngine: state.graphEngine, language: state.language,
        showHistory: state.showHistory, currentTime: state.currentTime, edgeSequence: state.edgeSequence,
        eventLog: JSON.parse(JSON.stringify(state.eventLog))
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
      a.download = `workbench-state-t${state.currentTime}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function triggerLoadJson() { if (fileInput.value) { fileInput.value.value = ''; fileInput.value.click(); } }
    function onFileLoaded(e) {
      const file = e.target.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) loadState({ eventLog: parsed });
          else if (parsed && typeof parsed === 'object') loadState(parsed);
          nextTick(() => { renderGraph(); });
        } catch (err) { console.error('Failed to parse state JSON:', err); alert('Invalid JSON file format.'); }
      };
      reader.readAsText(file);
    }

    return {
      state, t, layout, advanceTime, setPerspective, dispatch, semanticGraph,
      fileInput, saveJson, triggerLoadJson, onFileLoaded, renderGraph,
      entityClasses: ENTITY_CLASSES, relationTypes: RELATION_TYPES, availableNodes, goHome,
      launchScenario, jumpToQdikwStage, toggleSlotRegime, activeScenarioId, activeAudioSrc,
      activeParts, activeWarehouses, bizRegType, bizRegId, handleBizRegister,
      bizInstSource, bizInstTarget, handleBizInstall, bizInstallSources, bizInstallTargets,
      bizDefTarget, bizDefType, bizDefVal, handleBizReportDefect,
      bizRevDefect, handleBizRevokeDefect, handleBizDeleteDefect, activeDefectsList,
      bizDismPart, handleBizDismantle, installedComponents,
      bizDeleteNodeId, handleBizDeleteNode,
      bizStorePart, bizStoreTarget, handleBizStore,
      bomTrees, lpgNodeRecords, lpgRecords, rdfTtl, formatProperties, queryCode, liveQueryResult,
      visContainer, mermaidContainer, graphCaption, graphLegendItems,
      startResizeH, startResizeV, scenarioAudio, isPlaying, audioCurrentTime, audioDuration,
      showSubtitles, currentSubtitleText, playAudio, pauseAudio, togglePlayAudio, stopAudio,
      onTimeUpdate, onLoadedMetadata, onAudioEnded, onSeek, formatTime
    };
  },

  template: `
    <!-- Main Menu (Landing View) -->
    <div v-if="state.currentView === 'MENU'" class="landing-view">
      <div class="menu-card">
        <div class="menu-badge">{{ t.menuBadge }}</div>
        <h1 class="menu-title">{{ t.menuTitle }}</h1>
        <p class="menu-subtitle">{{ t.menuSubtitle }}</p>

        <div class="menu-actions">
          <button class="menu-btn menu-btn-primary" @click="state.currentView = 'SANDBOX'">
            <span class="btn-main-text">{{ t.menuSandboxTitle }}</span>
            <span class="btn-sub-text">{{ t.menuSandboxSub }}</span>
          </button>

          <button class="menu-btn menu-btn-scenario" @click="launchScenario('SANDBOX_TOUR')">
            <span class="btn-main-text">{{ t.menuTourTitle }}</span>
            <span class="btn-sub-text">{{ t.menuTourSub }}</span>
          </button>

          <button class="menu-btn menu-btn-scenario" @click="launchScenario('QDIKW_PIPELINE')">
            <span class="btn-main-text">{{ t.menuQdikwTitle }}</span>
            <span class="btn-sub-text">{{ t.menuQdikwSub }}</span>
          </button>

          <button class="menu-btn menu-btn-scenario" @click="launchScenario('VANISHING_CRACK')">
            <span class="btn-main-text">{{ t.menuCrackTitle }}</span>
            <span class="btn-sub-text">{{ t.menuCrackSub }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Fullscreen Narrative Figure Overlay -->
    <div v-if="state.figureOverlay?.visible" class="figure-modal-overlay">
      <div class="figure-modal-card">
        <button class="figure-modal-close" @click="state.figureOverlay.visible = false">{{ t.closeBtn }}</button>
        <img :src="state.figureOverlay.src" class="figure-modal-img" alt="Narrative Figure" />
        <div class="figure-modal-caption">{{ state.figureOverlay.caption }}</div>
        <div class="figure-modal-attribution" v-html="state.figureOverlay.attributionHtml"></div>
      </div>
    </div>

    <!-- Main Sandbox & Scenario Workspace -->
    <div v-if="state.currentView !== 'MENU'" class="sandbox-workspace">
      <div class="control-deck">

        <!-- QDIKW Stage & Role Banner -->
        <div id="qdikw-stage-bar" v-if="state.qdikw?.active" class="qdikw-banner">
          <div class="qdikw-steps">
            <span id="qdikw-step-Q" class="qdikw-step-pill" :class="{active: state.qdikw.stage === 'Q' || state.qdikw.stage === 'INTRO'}" @click="jumpToQdikwStage('Q')">{{ t.qdikwStepQ }}</span>
            <span id="qdikw-step-D" class="qdikw-step-pill" :class="{active: state.qdikw.stage === 'D'}" @click="jumpToQdikwStage('D')">{{ t.qdikwStepD }}</span>
            <span id="qdikw-step-I" class="qdikw-step-pill" :class="{active: state.qdikw.stage === 'I'}" @click="jumpToQdikwStage('I')">{{ t.qdikwStepI }}</span>
            <span id="qdikw-step-K" class="qdikw-step-pill" :class="{active: state.qdikw.stage === 'K'}" @click="jumpToQdikwStage('K')">{{ t.qdikwStepK }}</span>
            <span id="qdikw-step-W" class="qdikw-step-pill" :class="{active: state.qdikw.stage === 'W'}" @click="jumpToQdikwStage('W')">{{ t.qdikwStepW }}</span>
          </div>
          <div class="qdikw-role-box" v-if="state.qdikw.activeRole">
            <span class="qdikw-role-name">{{ state.qdikw.activeRole }}</span>
            <span class="qdikw-role-desc">{{ state.qdikw.roleBadge }}</span>
          </div>
        </div>

        <!-- Semantic Rules Toolbar -->
        <div id="qdikw-rules-bar" v-if="state.qdikw?.active" class="smrm-rules-row">
          <span style="color:#4c1d95; font-weight:700; margin-right: 8px;">{{ t.smrmRulesLabel }}</span>
          <label id="qdikw-rule-1" class="rule-chip" :class="{active: state.qdikw.rules.rule1}">
            <input type="checkbox" v-model="state.qdikw.rules.rule1" @change="renderGraph" style="display:none;">
            {{ t.rule1Label }}
          </label>
          <label id="qdikw-rule-2" class="rule-chip" :class="{active: state.qdikw.rules.rule2}">
            <input type="checkbox" v-model="state.qdikw.rules.rule2" @change="renderGraph" style="display:none;">
            {{ t.rule2Label }}
          </label>
          <label id="qdikw-rule-3" class="rule-chip" :class="{active: state.qdikw.rules.rule3}">
            <input type="checkbox" v-model="state.qdikw.rules.rule3" @change="renderGraph" style="display:none;">
            {{ t.rule3Label }}
          </label>

          <div id="qdikw-slot-config" style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
            <span style="font-weight: 600;">{{ t.slotRegimeLabel }}</span>
            <button class="rule-chip" :class="{active: state.qdikw.slotMetadata?.SLOT_FRONT_SUSPENSION?.loadRegime === 'DYNAMIC_CYCLIC'}" @click="toggleSlotRegime">
              {{ state.qdikw.slotMetadata?.SLOT_FRONT_SUSPENSION?.loadRegime || t.slotNoLoad }}
            </button>
          </div>
        </div>

        <div class="deck-row deck-row-top">
          <div class="section-label">
            <span class="iec-badge">IEC 63339 / SMIM<span class="iec-tooltip" v-html="t.tooltips.smim"></span></span>
            <span>{{ t.ontoTitle }}</span>
          </div>
          <div class="btn-group">
            <button id="ctrl-onto-bfo" :class="{ active: state.ontology === 'BFO' }" @click="state.ontology = 'BFO'">BFO (3D)</button>
            <button id="ctrl-onto-iso" :class="{ active: state.ontology === 'ISO15926' }" @click="state.ontology = 'ISO15926'">ISO 15926 (4D)</button>
            <button id="ctrl-onto-naive-node" :class="{ active: state.ontology === 'NAIVE_NODE' }" @click="state.ontology = 'NAIVE_NODE'">{{ t.ontoNaiveNode }}</button>
            <button id="ctrl-onto-naive-edge" :class="{ active: state.ontology === 'NAIVE_EDGE' }" @click="state.ontology = 'NAIVE_EDGE'">{{ t.ontoNaiveEdge }}</button>
          </div>

          <div class="divider"></div>

          <div class="section-label">
            <span class="iec-badge">IEC 63339<span class="iec-tooltip" v-html="t.tooltips.sms"></span></span>
            <span>👁️ {{ t.viewTitle }}</span>
          </div>
          <div class="btn-group">
            <button id="ctrl-view-smrm" :class="{ active: state.perspective === 'SMRM' }" @click="setPerspective('SMRM')">{{ t.viewSmrm }}</button>
            <button id="ctrl-view-logical" :class="{ active: state.perspective === 'SMIM' }" @click="setPerspective('SMIM')">{{ t.viewLogical }}</button>
            <button id="ctrl-view-physical-lpg" :class="{ active: state.perspective === 'SMS_LPG' }" @click="setPerspective('SMS_LPG')">{{ t.viewPhysicalLpg }}</button>
            <button id="ctrl-view-physical-rdf" :class="{ active: state.perspective === 'SMS_RDF' }" @click="setPerspective('SMS_RDF')">{{ t.viewPhysicalRdf }}</button>
          </div>

          <div class="divider"></div>

          <div class="section-label">🎨 <span>{{ t.engineTitle }}</span></div>
          <div class="btn-group">
            <button id="ctrl-engine-vis" :class="{ active: state.graphEngine === 'VIS' }" @click="state.graphEngine = 'VIS'">🌐 Vis.js</button>
            <button id="ctrl-engine-mermaid" :class="{ active: state.graphEngine === 'MERMAID' }" @click="state.graphEngine = 'MERMAID'">📊 Mermaid</button>
          </div>

          <div class="divider"></div>

          <button id="ctrl-save-json" class="secondary" @click="saveJson" :title="t.saveBtn">{{ t.saveBtn }}</button>
          <button id="ctrl-load-json" class="secondary" @click="triggerLoadJson" :title="t.loadBtn">{{ t.loadBtn }}</button>
          <input ref="fileInput" type="file" accept=".json" style="display: none;" @change="onFileLoaded" />

          <div style="margin-left: auto;" class="btn-group flag-group">
            <button id="ctrl-lang-sv" :class="{ active: state.language === 'sv' }" @click="state.language = 'sv'" title="Svenska">🇸🇪</button>
            <button id="ctrl-lang-en" :class="{ active: state.language === 'en' }" @click="state.language = 'en'" title="British English">🇬🇧</button>
            <button id="ctrl-lang-ru" :class="{ active: state.language === 'ru' }" @click="state.language = 'ru'" title="Русский">🇷🇺</button>
          </div>
        </div>

        <template v-if="state.userRole === 'UNI_ENGINEER'">
          <div class="deck-row">
            <span id="biz-time-badge" class="badge">T = {{ state.currentTime }}</span>
            <button id="biz-step-btn" @click="advanceTime">{{ t.stepBtn }}</button>

            <div class="divider"></div>

            <label class="action-label">{{ t.actRegister }}</label>
            <select id="biz-reg-type" v-model="bizRegType" title="Entity Class">
              <option value="Vehicle">Vehicle</option>
              <option value="Slot">Slot</option>
              <option value="Part">Part</option>
              <option value="Warehouse">Warehouse</option>
            </select>
            <input id="biz-reg-id" type="text" v-model="bizRegId" placeholder="ID (e.g. Part_B)" style="width: 110px;" @keyup.enter="handleBizRegister">
            <button id="biz-reg-btn" class="secondary" @click="handleBizRegister">{{ t.actRegisterBtn }}</button>

            <div class="divider"></div>

            <label class="action-label">{{ t.actInstall }}</label>
            <select id="biz-inst-source" v-model="bizInstSource" title="Component to install">
              <option v-for="node in bizInstallSources" :key="'src_' + node" :value="node">{{ node }}</option>
            </select>
            <span style="font-size: 11px; color: #64748b;">→</span>
            <select id="biz-inst-target" v-model="bizInstTarget" title="Target Parent / System">
              <option v-for="node in bizInstallTargets" :key="'tgt_' + node" :value="node">{{ node }}</option>
            </select>
            <button id="biz-inst-btn" class="secondary" @click="handleBizInstall">{{ t.actInstallBtn }}</button>

            <div class="divider"></div>

            <label class="action-label">{{ t.actDismantle }}</label>
            <select id="biz-dism-part" v-model="bizDismPart">
              <option v-for="comp in installedComponents" :key="'comp_' + comp" :value="comp">{{ comp }}</option>
            </select>
            <button id="biz-dism-btn" class="danger" @click="handleBizDismantle">{{ t.actDismantleBtn }}</button>

            <div class="divider"></div>

            <label class="action-label">{{ t.actDelete }}</label>
            <select id="biz-del-node" v-model="bizDeleteNodeId" title="Sandbox Reset: Delete entity">
              <option v-for="node in availableNodes" :key="'del_' + node" :value="node">{{ node }}</option>
            </select>
            <button id="biz-del-btn" class="danger" @click="handleBizDeleteNode" title="Sandbox Reset: Delete selected entity">🗑️</button>
          </div>

          <div class="deck-row" style="border-top: 1px solid #f1f5f9; background: #fafafa;">
            <label class="action-label">{{ t.actDefect }}</label>
            <select id="biz-def-target" v-model="bizDefTarget">
              <option v-for="node in availableNodes" :key="'dn_' + node" :value="node">{{ node }}</option>
            </select>
            <input id="biz-def-type" type="text" v-model="bizDefType" placeholder="Type (e.g. crack)" style="width: 110px;">
            <input id="biz-def-val" type="text" v-model="bizDefVal" placeholder="Value (e.g. 15mm)" style="width: 85px;">
            <button id="biz-def-btn" class="secondary" @click="handleBizReportDefect">{{ t.actDefectBtn }}</button>

            <div class="divider"></div>

            <label class="action-label">{{ t.actRevoke }}</label>
            <select id="biz-rev-defect" v-model="bizRevDefect">
              <option v-for="d in activeDefectsList" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
            <button id="biz-rev-btn" class="secondary" @click="handleBizRevokeDefect" title="Revoke defect (close in history)">{{ t.actRevokeBtn }}</button>
            <button id="biz-del-def-btn" class="danger" @click="handleBizDeleteDefect" title="Sandbox Reset: Delete defect completely">🗑️</button>

            <div class="divider"></div>

            <label class="action-label">{{ t.actStorage }}</label>
            <select id="biz-store-part" v-model="bizStorePart">
              <option v-for="part in activeParts" :key="'sp_' + part" :value="part">{{ part }}</option>
            </select>
            <span style="font-size: 11px; color: #64748b;">→</span>
            <select id="biz-store-target" v-model="bizStoreTarget">
              <option v-for="wh in activeWarehouses" :key="'sw_' + wh" :value="wh">{{ wh }}</option>
            </select>
            <button id="biz-store-btn" class="secondary" @click="handleBizStore">{{ t.actStorageBtn }}</button>

            <div class="divider"></div>

            <label style="font-size: 11px; display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="checkbox" v-model="state.showHistory"> {{ t.history }}
            </label>
          </div>
        </template>
      </div>

      <div class="main-container">
        <div id="canvas-container" :style="{ flex: '0 0 ' + layout.leftWidth + '%' }">
          <div ref="visContainer" id="vis-container" v-show="state.graphEngine === 'VIS'"></div>
          <div ref="mermaidContainer" id="mermaid-container" v-show="state.graphEngine === 'MERMAID'"></div>

          <div class="graph-caption">
            <span>📌</span>
            <span>{{ graphCaption }}</span>
          </div>

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

        <div class="resizer" id="panel-resizer" @mousedown="startResizeH"></div>

        <div class="sidebar" style="flex: 1;">
          <div class="card" :style="{ flex: '0 0 ' + layout.bomHeight + '%' }">
            <h4>
              <span>{{ t.titleBom }}</span>
              <span class="iec-badge align-right">IEC 63339 / URMSM<span class="iec-tooltip" v-html="t.tooltips.urmsm"></span></span>
            </h4>
            <div id="tree-container" class="card-scroll-body">
              <template v-if="bomTrees.length > 0">
                <ul class="tree root-tree">
                  <bom-node v-for="root in bomTrees" :key="root.id" :node="root" />
                </ul>
              </template>
              <div v-else class="empty-placeholder">
                {{ t.emptyBom }}{{ state.currentTime }}
              </div>
            </div>
          </div>

          <div class="resizer-h" @mousedown="(e) => startResizeV(e, 'bomHeight', '.sidebar')"></div>

          <div class="card" :style="{ flex: '0 0 ' + layout.storageHeight + '%' }">
            <h4>
              <span>{{ t.titleStorage }} <small style="color:#0284c7; font-weight: 700;">({{ state.ontology }})</small></span>
              <div class="btn-group mini-toggle">
                <button :class="{ active: state.storage === 'LPG' }" @click="state.storage = 'LPG'">LPG</button>
                <button :class="{ active: state.storage === 'RDF' }" @click="state.storage = 'RDF'">RDF (W3C)</button>
              </div>
            </h4>
            <div id="storage-content" class="card-scroll-body">
              <template v-if="state.storage === 'LPG'">
                <div class="store-sub-header">{{ t.nodeStoreTitle }} ({{ lpgNodeRecords.length }})</div>
                <table v-if="lpgNodeRecords.length > 0" class="storage-table">
                  <thead>
                    <tr>
                      <th>Node ID</th>
                      <th>Label / Class</th>
                      <th>Properties</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="n in lpgNodeRecords" :key="'nd_' + n.id" :class="n.isActive ? 'active-row' : 'closed-row'">
                      <td><strong>{{ n.id }}</strong></td>
                      <td><code>:{{ n.type }}</code></td>
                      <td>
                        <code v-if="formatProperties(n.properties)">{ {{ formatProperties(n.properties) }} }</code>
                        <span v-else>—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="empty-placeholder">0 nodes</div>

                <div class="store-sub-header" style="margin-top: 8px;">{{ t.edgeStoreTitle }} ({{ lpgRecords.length }})</div>
                <table v-if="lpgRecords.length > 0" class="storage-table">
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
                <div v-else class="empty-placeholder">0 relationships</div>
              </template>
              <pre v-else class="code-block">{{ rdfTtl }}</pre>
            </div>
          </div>

          <div class="resizer-h" @mousedown="(e) => startResizeV(e, 'storageHeight', '.sidebar')"></div>

          <div class="card" style="flex: 1;">
            <h4>
              <span>{{ t.queryTitle }} ({{ state.storage === 'LPG' ? 'Cypher' : 'SPARQL' }})</span>
              <span style="font-weight: 600; text-transform: none; color: #0d9488;">{{ t.queryDesc }}{{ state.currentTime }})</span>
            </h4>
            <div id="query-content" class="card-scroll-body">
              <pre class="code-block query-code-block" :style="{ color: state.ontology === 'BFO' ? '#0369a1' : '#3730a3' }">{{ queryCode }}</pre>

              <div class="query-result-box">
                <div class="query-result-header">
                  <span>{{ t.queryResultTitle }}</span>
                  <span
                    class="defect-counter-badge"
                    :class="liveQueryResult.defectiveCount > 0 ? 'defect-alert-found' : 'defect-alert-zero'"
                  >
                    {{ t.queryDefectsFound }} {{ liveQueryResult.defectiveCount }}
                  </span>
                </div>

                <!-- QDIKW Alerts (Wisdom & Blind Spots) -->
                <div id="qdikw-wisdom-box" v-for="alert in semanticGraph.wisdomAlerts" :key="alert" class="wisdom-directive-card">
                  🔴 <strong>{{ t.wisdomHeader }}</strong> {{ alert }}
                </div>
                <div id="qdikw-blindspot-box" v-for="bs in semanticGraph.blindSpots" :key="bs" class="blindspot-warning-card">
                  ⚠️ <strong>{{ t.blindspotHeader }}</strong> {{ bs }}
                </div>

                <table v-if="liveQueryResult.rows.length > 0" class="storage-table" style="margin-top: 8px;">
                  <thead>
                    <tr>
                      <th>part</th>
                      <th>location</th>
                      <th>defect</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, idx) in liveQueryResult.rows" :key="idx">
                      <td><strong>{{ r.part }}</strong></td>
                      <td>{{ r.location }}</td>
                      <td>
                        <span :class="r.hasDefect ? 'bom-defect-badge' : 'null-badge'">{{ r.defect }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="empty-placeholder">0 rows returned at T = {{ state.currentTime }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <audio ref="scenarioAudio" :src="activeAudioSrc" preload="metadata" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMetadata" @play="isPlaying = true" @pause="isPlaying = false" @ended="onAudioEnded"></audio>
      <div v-if="state.currentView === 'SCENARIO' && showSubtitles && currentSubtitleText" class="scenario-subtitles">{{ currentSubtitleText }}</div>

      <div v-if="state.currentView === 'SCENARIO'" class="scenario-player-panel">
        <button class="player-btn" @click="togglePlayAudio" :title="isPlaying ? 'Pause' : 'Play'"><span v-if="isPlaying">⏸</span><span v-else>▶</span></button>
        <button class="player-btn" @click="stopAudio(true)" title="Stop"><span>⏹</span></button>
        <input type="range" class="player-progress" min="0" :max="audioDuration || 108" step="0.1" :value="audioCurrentTime" @input="onSeek" />
        <span class="player-time">{{ formatTime(audioCurrentTime) }} / {{ formatTime(audioDuration) }}</span>
        <button class="player-btn player-btn-cc" :class="{ active: showSubtitles }" @click="showSubtitles = !showSubtitles">CC</button>
      </div>
      <button v-if="state.currentView !== 'MENU'" class="floating-home-btn" @click="goHome" title="Return to Main Menu">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
      </button>
    </div>
  `
};

createApp(App).mount('#app');