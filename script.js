mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  flowchart: { curve: 'basis', htmlLabels: true }
});

const i18n = {
  sv: {
    ontoTitle: "Ontologi:", graphTitle: "Datamodell:", engineTitle: "Grafmotor:",
    stepBtn: "Lås steg (T+1)", parent: "Överordnad:", partPlaceholder: "Komponentnamn",
    addBtn: "+ Lägg till", removeBtn: "Uteslut relation", history: "Historik",
    titleBom: "Struktur (BOM)", titleStorage: "Under huven",
    activeStatus: "Aktiv", closedStatus: "Avslutad", sourceCol: "Källa",
    targetCol: "Mål", statusCol: "Status", smrmStatus: "Domänontologi (Låst: System/IDO)",
    saveBtn: "💾 Spara JSON", loadBtn: "📂 Ladda JSON",
    queryTitle: "Databasfråga", queryDesc: "Visa aktuell struktur (T = T_nu)",
    tooltips: {
      urmsm: "<b>URMSM (Dimension & Aspect)</b><br/>Definierar intressentens perspektiv (ISO 42010 Viewpoint). Användaren ser bara BOM-strukturen vid tidpunkten T, oavsett underliggande IT-lager.",
      smrm: "<b>SMRM (Concept Repository)</b><br/>Domänontologi och gemensam begreppsbank (System, Component, Physical/Functional Object). Här låst till standardiserad produktnedbrytning.",
      smim: "<b>SMIM (Information Elements & Rules)</b><br/>Top-Level Ontology (TLO). Formella regler för hur begreppen existerar i tiden: 3D-objekt med tidsintervall (BFO) eller 4D-rumtidsindivider (ISO 15926).",
      sms: "<b>SMS (Data in Tool)</b><br/>Den faktiska IT-implementationen och datalagringen (Property Graph / Neo4j kontra W3C RDF Triples)."
    },
    legend: {
      title: "Teckenförklaring", nodes: "Noder", edges: "Relationer",
      bfoSys: "Continuant / System (:System)", bfoElem: "Continuant / Komponent (:Element)",
      bfoActiveEdge: "Aktiv relation [giltig till nu]", bfoPastEdge: "Historisk relation (avslutad)",
      iso4d: "4D-individ (Spatio-Temporal Extent)", isoState: "Temporal del / Tillstånd (State)",
      isoPartRel: "Tidlös komposition (hasPart)", isoSliceRel: "temporalPartOf (del av 4D-individ)",
      isoTransitionRel: "TRANSITION_TO (tillståndskedja i LPG)", rdfStmt: "Reifiering (_:statement)",
      rdfLit: "Literal (tidsstämpel xsd:int)", rdfPred: "RDF-predikat"
    }
  },
  en: {
    ontoTitle: "Ontology:", graphTitle: "Data Model:", engineTitle: "Renderer:",
    stepBtn: "Commit step (T+1)", parent: "Parent:", partPlaceholder: "Component name",
    addBtn: "+ Add", removeBtn: "Sever relation", history: "History",
    titleBom: "BOM Tree Structure", titleStorage: "Under the Bonnet",
    activeStatus: "Active", closedStatus: "Closed", sourceCol: "Source",
    targetCol: "Target", statusCol: "Status", smrmStatus: "Domain Ontology (Fixed: System/IDO)",
    saveBtn: "💾 Save JSON", loadBtn: "📂 Load JSON",
    queryTitle: "Database Query", queryDesc: "Show current structure (T = T_now)",
    tooltips: {
      urmsm: "<b>URMSM (Dimension & Aspect)</b><br/>Captures the stakeholder concern and viewpoint (ISO 42010). The engineer always sees a unified BOM snapshot at time T, decoupled from graph mechanics.",
      smrm: "<b>SMRM (Concept Repository)</b><br/>Domain Ontology: the shared engineering lexicon (System, System Element, Physical/Functional Object). Fixed here to ISO-aligned decomposition.",
      smim: "<b>SMIM (Information Elements & Rules)</b><br/>Top-Level Ontology (TLO). Axiomatic rules governing time and identity: 3D Continuants (BFO) vs 4D Spatio-Temporal Extents (ISO 15926).",
      sms: "<b>SMS (Data in Tool)</b><br/>Low-level physical IT implementation: Labeled Property Graphs (Neo4j style) vs W3C RDF Triples and serialized statements."
    },
    legend: {
      title: "Graph Legend", nodes: "Node Types", edges: "Relationships",
      bfoSys: "Continuant / System (:System)", bfoElem: "Continuant / Component (:Element)",
      bfoActiveEdge: "Active relation [valid to now]", bfoPastEdge: "Historical relation (closed)",
      iso4d: "4D Individual (Spatio-Temporal Extent)", isoState: "Temporal Part / State",
      isoPartRel: "Tenseless Composition (hasPart)", isoSliceRel: "temporalPartOf (Extent link)",
      isoTransitionRel: "TRANSITION_TO (State Chain in LPG)", rdfStmt: "Reification Node (_:statement)",
      rdfLit: "Literal (xsd:int timestamp)", rdfPred: "RDF Predicate"
    }
  },
  ru: {
    ontoTitle: "Онтология:", graphTitle: "Модель данных:", engineTitle: "Движок:",
    stepBtn: "Зафиксировать шаг (T+1)", parent: "Родитель:", partPlaceholder: "Имя компонента",
    addBtn: "+ Добавить", removeBtn: "Исключить связь", history: "История",
    titleBom: "Состав изделия (BOM)", titleStorage: "Под капотом",
    activeStatus: "Активна", closedStatus: "Закрыта", sourceCol: "Источник",
    targetCol: "Цель", statusCol: "Статус", smrmStatus: "Domain Ontology (Зафиксирована: System/IDO)",
    saveBtn: "💾 Сохранить JSON", loadBtn: "📂 Загрузить JSON",
    queryTitle: "Запрос к БД", queryDesc: "Показать текущую структуру (T = T_now)",
    tooltips: {
      urmsm: "<b>URMSM (Dimension & Aspect)</b><br/>Уровень точки зрения пользователя (ISO 42010). Инженер всегда видит чистый срез BOM на момент времени T, абстрагированный от структуры базы данных.",
      smrm: "<b>SMRM (Concept Repository)</b><br/>Онтология предметной области (Domain Ontology). Общий словарь понятий проекта (System, Component, Physical Object). Зафиксирована на базовой декомпозиции.",
      smim: "<b>SMIM (Information Elements & Rules)</b><br/>Верхнеуровневая онтология (TLO). Математические аксиомы бытия и времени: 3D-тела с интервалами связей (BFO) или 4D-объемы пространства-времени (ISO 15926).",
      sms: "<b>SMS (Data in Tool)</b><br/>Физическое IT-хранилище в конкретной СУБД: узлы и свойства на ребрах (LPG) против атомарных триплетов URI (W3C RDF)."
    },
    legend: {
      title: "Легенда графа", nodes: "Типы узлов", edges: "Типы связей",
      bfoSys: "Континуант / Система (:System)", bfoElem: "Континуант / Компонент (:Element)",
      bfoActiveEdge: "Активная связь [действует сейчас]", bfoPastEdge: "Архивная связь (закрыта)",
      iso4d: "4D-индивид (Пространственно-временной объем)", isoState: "Темпоральный срез / Состояние",
      isoPartRel: "Вневременной состав (hasPart)", isoSliceRel: "temporalPartOf (связь с 4D-целым)",
      isoTransitionRel: "TRANSITION_TO (цепочка состояний в LPG)", rdfStmt: "Узел реификации (_:statement)",
      rdfLit: "Литерал (метка времени xsd:int)", rdfPred: "RDF-предикат"
    }
  }
};

let currentLang = 'sv';
let currentOntology = 'BFO';       
let currentMode = 'LPG';            
let currentEngine = 'vis';          
let currentTime = 0;
const ROOT_ID = 'System_A';

const baseNodes = [{ id: ROOT_ID, label: 'System_A', type: 'system' }];
let edgesStore = [];
let edgeSeq = 1;
let mermaidCounter = 0;

let isRenderingMermaid = false;
let pendingMermaidDef = null;

const visNodes = new vis.DataSet();
const visEdges = new vis.DataSet();
const visContainer = document.getElementById('vis-container');

function getVisOptions() {
  const isComplex = (currentMode === 'RDF' || currentOntology === 'ISO15926');
  return {
    physics: {
      stabilization: { iterations: 120 },
      barnesHut: { gravitationalConstant: isComplex ? -24000 : -10000, centralGravity: 0.25, springLength: isComplex ? 220 : 150, springConstant: 0.04, damping: 0.09, avoidOverlap: 1 }
    },
    nodes: { shape: 'box', margin: 10, font: { size: 12, face: 'system-ui' }, borderWidth: 1.5 },
    edges: { arrows: 'to', smooth: { type: 'continuous', roundness: 0.2 }, font: { size: 10, align: 'middle', background: '#ffffff', strokeWidth: 0 } }
  };
}

const network = new vis.Network(visContainer, { nodes: visNodes, edges: visEdges }, getVisOptions());

function safeId(id) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

function setLanguage(lang) {
  currentLang = lang;
  ['sv', 'en', 'ru'].forEach(l => { document.getElementById(`lang-${l}`).className = (lang === l) ? 'active' : ''; });

  const t = i18n[lang];
  document.getElementById('lbl-onto-title').innerText = t.ontoTitle;
  document.getElementById('lbl-graph-title').innerText = t.graphTitle;
  document.getElementById('lbl-engine-title').innerText = t.engineTitle;
  document.getElementById('step-btn').innerText = t.stepBtn;
  document.getElementById('lbl-parent').innerText = t.parent;
  document.getElementById('part-input').placeholder = t.partPlaceholder;
  document.getElementById('add-btn').innerText = t.addBtn;
  document.getElementById('remove-btn').innerText = t.removeBtn;
  document.getElementById('lbl-history').innerText = t.history;
  document.getElementById('title-bom').innerText = t.titleBom;
  document.getElementById('title-storage').innerText = t.titleStorage;
  document.getElementById('lbl-smrm-status').innerText = t.smrmStatus;
  
  document.getElementById('save-btn').innerText = t.saveBtn;
  document.getElementById('load-btn').innerText = t.loadBtn;
  document.getElementById('title-query').innerText = t.queryTitle;
  document.getElementById('query-desc').innerText = t.queryDesc;

  document.getElementById('tt-urmsm').innerHTML = t.tooltips.urmsm;
  document.getElementById('tt-smrm').innerHTML = t.tooltips.smrm;
  document.getElementById('tt-smim').innerHTML = t.tooltips.smim;
  document.getElementById('tt-sms').innerHTML = t.tooltips.sms;

  render();
}

function setOntology(onto) {
  currentOntology = onto;
  document.getElementById('onto-bfo').className = (onto === 'BFO') ? 'active' : '';
  document.getElementById('onto-iso').className = (onto === 'ISO15926') ? 'active' : '';
  network.setOptions(getVisOptions());
  render();
}

function setGraphMode(mode) {
  currentMode = mode;
  document.getElementById('mode-lpg').className = (mode === 'LPG') ? 'active' : '';
  document.getElementById('mode-rdf').className = (mode === 'RDF') ? 'active' : '';
  network.setOptions(getVisOptions());
  render();
}

function setEngine(engine) {
  currentEngine = engine;
  document.getElementById('eng-vis').className = (engine === 'vis') ? 'active' : '';
  document.getElementById('eng-mermaid').className = (engine === 'mermaid') ? 'active' : '';

  if (engine === 'vis') {
    document.getElementById('vis-container').style.display = 'block';
    document.getElementById('mermaid-container').style.display = 'none';
    network.setOptions(getVisOptions());
    network.fit();
  } else {
    document.getElementById('vis-container').style.display = 'none';
    document.getElementById('mermaid-container').style.display = 'flex';
  }
  render();
}

// Export/Import JSON logic
function exportData() {
  const data = { baseNodes, edgesStore, currentTime, edgeSeq };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bom_structure_T${currentTime}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.baseNodes && data.edgesStore) {
        baseNodes.length = 0; baseNodes.push(...data.baseNodes);
        edgesStore.length = 0; edgesStore.push(...data.edgesStore);
        currentTime = data.currentTime || 0; edgeSeq = data.edgeSeq || 1;
        document.getElementById('time-display').innerText = `T = ${currentTime}`;
        render();
      }
    } catch (err) {
      alert('Error parsing JSON');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function addPart(parentId, name, silent = false) {
  if (!name || !parentId) return;
  const partId = name.trim();
  if (parentId === partId) return;

  const exists = edgesStore.find(e => e.from === parentId && e.to === partId && e.valid_to === null);
  if (exists) return;

  if (!baseNodes.some(n => n.id === partId)) baseNodes.push({ id: partId, label: partId, type: 'element' });

  edgesStore.push({ id: 'e' + edgeSeq++, from: parentId, to: partId, valid_from: currentTime, valid_to: null });

  if (!silent) render();
}

function handleAddPart() {
  const parent = document.getElementById('parent-select').value;
  const input = document.getElementById('part-input');
  addPart(parent, input.value);
  input.value = '';
}

function handleRemoveEdge() {
  const edgeId = document.getElementById('remove-select').value;
  const edge = edgesStore.find(e => e.id === edgeId);
  if (edge && edge.valid_to === null) edge.valid_to = currentTime;
  render();
}

function advanceTime() {
  currentTime++;
  document.getElementById('time-display').innerText = `T = ${currentTime}`;
  render();
}

function buildTreeHTML(nodeId, activeEdges) {
  const children = activeEdges.filter(e => e.from === nodeId).map(e => e.to);
  if (children.length === 0) return '';
  let html = '<ul class="tree">';
  children.forEach(childId => {
    html += `<li><strong>${childId}</strong>${buildTreeHTML(childId, activeEdges)}</li>`;
  });
  html += '</ul>';
  return html;
}

function renderVisData(visibleEdges) {
  visNodes.clear(); visEdges.clear();

  if (currentOntology === 'BFO') {
    if (currentMode === 'LPG') {
      baseNodes.forEach(n => { visNodes.add({ id: n.id, label: `${n.label}\n(:bfo:MaterialEntity)`, color: n.type === 'system' ? '#0284c7' : '#64748b', font: { color: '#ffffff', bold: n.type === 'system' } }); });
      visibleEdges.forEach(e => { visEdges.add({ id: e.id, from: e.from, to: e.to, label: e.isActive ? `has_part: [T${e.valid_from}..now]` : `has_part: [T${e.valid_from}..T${e.valid_to}]`, color: e.isActive ? { color: '#10b981' } : { color: '#cbd5e1' }, dashes: !e.isActive, width: e.isActive ? 2 : 1 }); });
    } else {
      baseNodes.forEach(n => { visNodes.add({ id: n.id, label: `:${n.label}\na bfo:MaterialEntity`, color: n.type === 'system' ? '#0284c7' : '#475569', font: { color: '#ffffff' } }); });
      visibleEdges.forEach(e => {
        const stmtId = `stmt_${e.id}`, litFromId = `lit_from_${e.id}`, litToId = `lit_to_${e.id}`;
        visNodes.add({ id: stmtId, label: `_:${e.id}\na :TemporalPartMembership`, shape: 'diamond', size: 26, color: e.isActive ? '#f59e0b' : '#e2e8f0', font: { size: 9, color: e.isActive ? '#000000' : '#64748b' } });
        visEdges.add({ from: stmtId, to: e.from, label: ':hasParent', color: '#94a3b8' });
        visEdges.add({ from: stmtId, to: e.to, label: ':hasChild', color: '#94a3b8' });
        visNodes.add({ id: litFromId, label: `"T${e.valid_from}"^^xsd:int`, shape: 'box', color: '#f8fafc', font: { size: 8 } });
        visEdges.add({ from: stmtId, to: litFromId, label: ':validFrom', color: '#cbd5e1' });
        if (e.valid_to !== null) {
          visNodes.add({ id: litToId, label: `"T${e.valid_to}"^^xsd:int`, shape: 'box', color: '#f8fafc', font: { size: 8 } });
          visEdges.add({ from: stmtId, to: litToId, label: ':validTo', color: '#cbd5e1', dashes: true });
        }
      });
    }
  } else {
    baseNodes.forEach(n => { visNodes.add({ id: `4d_${n.id}`, label: `${n.label}_4D\n(iso:ActualIndividual)`, color: '#4f46e5', font: { color: '#ffffff', bold: true } }); });
    const parentStates = {};

    visibleEdges.forEach(e => {
      const parentStateId = `st_${e.from}_${e.id}`, childStateId = `st_${e.to}_${e.id}`;
      const timeSpan = e.isActive ? `[T${e.valid_from}..now]` : `[T${e.valid_from}..T${e.valid_to}]`;

      visNodes.add({ id: parentStateId, label: `${e.from}_State\n${timeSpan}`, color: '#0d9488', font: { color: '#ffffff' } });
      visNodes.add({ id: childStateId, label: `${e.to}_State\n${timeSpan}`, color: '#0d9488', font: { color: '#ffffff' } });
      visEdges.add({ from: parentStateId, to: `4d_${e.from}`, label: 'temporalPartOf', color: '#94a3b8', dashes: true });
      visEdges.add({ from: childStateId, to: `4d_${e.to}`, label: 'temporalPartOf', color: '#94a3b8', dashes: true });

      if (currentMode === 'LPG') {
        visEdges.add({ from: parentStateId, to: childStateId, label: `COMPOSED_OF\n{qty:1, rev:'${e.id}'}`, color: e.isActive ? { color: '#10b981' } : { color: '#cbd5e1' }, width: e.isActive ? 2 : 1 });
        if (!parentStates[e.from]) parentStates[e.from] = [];
        parentStates[e.from].push({ id: parentStateId, edge: e });
      } else {
        visEdges.add({ from: parentStateId, to: childStateId, label: ':hasPart', color: e.isActive ? { color: '#10b981' } : { color: '#cbd5e1' }, width: e.isActive ? 2 : 1 });
      }
    });

    if (currentMode === 'LPG') {
      Object.keys(parentStates).forEach(parentId => {
        const list = parentStates[parentId];
        for (let i = 0; i < list.length - 1; i++) {
          visEdges.add({ from: list[i].id, to: list[i+1].id, label: `TRANSITION_TO\n{at: T${list[i+1].edge.valid_from}}`, color: { color: '#f59e0b' }, width: 2 });
        }
      });
    }
  }
}

function generateMermaidDef(visibleEdges) {
  let def = 'flowchart TD\n  classDef bfoSys fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px\n  classDef bfoElem fill:#64748b,stroke:#475569,color:#ffffff,stroke-width:1px\n  classDef iso4d fill:#4f46e5,stroke:#3730a3,color:#ffffff,stroke-width:2px\n  classDef isoState fill:#0d9488,stroke:#0f766e,color:#ffffff,stroke-width:1px\n  classDef rdfStmt fill:#f59e0b,stroke:#d97706,color:#000000,stroke-width:1px\n  classDef rdfLit fill:#f1f5f9,stroke:#cbd5e1,color:#334155,stroke-dasharray:3 3\n\n';

  if (currentOntology === 'BFO') {
    if (currentMode === 'LPG') {
      baseNodes.forEach(n => { def += `  ${safeId(n.id)}["<b>${n.label}</b><br/>bfo:MaterialEntity"]:::${n.type === 'system' ? 'bfoSys' : 'bfoElem'}\n`; });
      visibleEdges.forEach(e => { def += e.isActive ? `  ${safeId(e.from)} -->|"has_part: T${e.valid_from} → now"| ${safeId(e.to)}\n` : `  ${safeId(e.from)} -.->|"has_part: T${e.valid_from} → T${e.valid_to}"| ${safeId(e.to)}\n`; });
    } else {
      baseNodes.forEach(n => { def += `  ${safeId(n.id)}["<b>:${n.label}</b><br/>a bfo:MaterialEntity"]:::bfoSys\n`; });
      visibleEdges.forEach(e => {
        const stmtId = `stmt_${safeId(e.id)}`, lFrom = `lit_from_${safeId(e.id)}`, lTo = `lit_to_${safeId(e.id)}`;
        def += `  ${stmtId}{{"<b>_:${e.id}</b><br/>a :TemporalPartMembership"}}:::rdfStmt\n  ${stmtId} -->|:hasParent| ${safeId(e.from)}\n  ${stmtId} -->|:hasChild| ${safeId(e.to)}\n  ${lFrom}(["T${e.valid_from} (xsd:int)"]):::rdfLit\n  ${stmtId} -->|:validFrom| ${lFrom}\n`;
        if (e.valid_to !== null) def += `  ${lTo}(["T${e.valid_to} (xsd:int)"]):::rdfLit\n  ${stmtId} -.->|:validTo| ${lTo}\n`;
      });
    }
  } else {
    baseNodes.forEach(n => { def += `  whole_${safeId(n.id)}["<b>${n.label}_4D</b><br/>iso:ActualIndividual"]:::iso4d\n`; });
    const parentStates = {};

    visibleEdges.forEach(e => {
      const pState = `st_${safeId(e.from)}_${safeId(e.id)}`, cState = `st_${safeId(e.to)}_${safeId(e.id)}`, pWhole = `whole_${safeId(e.from)}`, cWhole = `whole_${safeId(e.to)}`, span = e.isActive ? `T${e.valid_from} → now` : `T${e.valid_from} → T${e.valid_to}`;
      def += `  ${pState}["${e.from}_State<br/>${span}"]:::isoState\n  ${cState}["${e.to}_State<br/>${span}"]:::isoState\n  ${pState} -.->|temporalPartOf| ${pWhole}\n  ${cState} -.->|temporalPartOf| ${cWhole}\n`;
      if (currentMode === 'LPG') {
        def += `  ${pState} -->|"COMPOSED_OF [qty:1]"| ${cState}\n`;
        if (!parentStates[e.from]) parentStates[e.from] = [];
        parentStates[e.from].push({ id: pState, edge: e });
      } else {
        def += `  ${pState} -->|:hasPart| ${cState}\n`;
      }
    });

    if (currentMode === 'LPG') {
      Object.keys(parentStates).forEach(parentId => {
        const list = parentStates[parentId];
        for (let i = 0; i < list.length - 1; i++) {
          def += `  ${list[i].id} ==>|"TRANSITION_TO (at: T${list[i+1].edge.valid_from})"| ${list[i+1].id}\n`;
        }
      });
    }
  }
  return def;
}

async function executeMermaidRender(chartDefinition) {
  if (isRenderingMermaid) { pendingMermaidDef = chartDefinition; return; }
  isRenderingMermaid = true;
  const container = document.getElementById('mermaid-container');
  try {
    const renderId = 'mermaid_svg_' + (++mermaidCounter);
    const { svg } = await mermaid.render(renderId, chartDefinition);
    container.innerHTML = svg;
  } catch (err) { console.error("Mermaid Render Error:", err); } 
  finally { isRenderingMermaid = false; if (pendingMermaidDef) { const next = pendingMermaidDef; pendingMermaidDef = null; executeMermaidRender(next); } }
}

function updateLegend() {
  const leg = i18n[currentLang].legend, container = document.getElementById('graph-legend'), headerTag = `${currentOntology} + ${currentMode}`;
  if (currentOntology === 'BFO') {
    if (currentMode === 'LPG') {
      container.innerHTML = `<div class="legend-title"><span>${leg.title}</span> <span style="color:#0284c7;">${headerTag}</span></div><div class="legend-section"><div class="legend-section-title">${leg.nodes}</div><div class="legend-item"><span class="swatch-box-sys"></span>${leg.bfoSys}</div><div class="legend-item"><span class="swatch-box-elem"></span>${leg.bfoElem}</div></div><div class="legend-section"><div class="legend-section-title">${leg.edges}</div><div class="legend-item"><span class="swatch-line-active"></span>${leg.bfoActiveEdge}</div><div class="legend-item"><span class="swatch-line-past"></span>${leg.bfoPastEdge}</div></div>`;
    } else {
      container.innerHTML = `<div class="legend-title"><span>${leg.title}</span> <span style="color:#0284c7;">${headerTag}</span></div><div class="legend-section"><div class="legend-section-title">${leg.nodes}</div><div class="legend-item"><span class="swatch-box-sys"></span>${leg.bfoSys}</div><div class="legend-item"><span class="swatch-diamond"></span>${leg.rdfStmt}</div><div class="legend-item"><span class="swatch-literal"></span>${leg.rdfLit}</div></div><div class="legend-section"><div class="legend-section-title">${leg.edges}</div><div class="legend-item"><span class="swatch-line-active" style="background:#94a3b8"></span>${leg.rdfPred}</div></div>`;
    }
  } else {
    const extraLpgEdge = (currentMode === 'LPG') ? `<div class="legend-item"><span class="swatch-line-transition"></span>${leg.isoTransitionRel}</div>` : '';
    container.innerHTML = `<div class="legend-title"><span>${leg.title}</span> <span style="color:#4f46e5;">${headerTag}</span></div><div class="legend-section"><div class="legend-section-title">${leg.nodes}</div><div class="legend-item"><span class="swatch-box-4d"></span>${leg.iso4d}</div><div class="legend-item"><span class="swatch-box-state"></span>${leg.isoState}</div></div><div class="legend-section"><div class="legend-section-title">${leg.edges}</div><div class="legend-item"><span class="swatch-line-active"></span>${leg.isoPartRel}</div><div class="legend-item"><span class="swatch-line-past"></span>${leg.isoSliceRel}</div>${extraLpgEdge}</div>`;
  }
}

function render() {
  const t = i18n[currentLang];
  const showHistory = document.getElementById('history-toggle').checked;

  const activeEdges = [], visibleEdges = [];
  edgesStore.forEach(edge => {
    const isActive = (edge.valid_to === null || edge.valid_to > currentTime) && edge.valid_from <= currentTime;
    const isPast = edge.valid_to !== null && edge.valid_to <= currentTime;
    if (isActive) activeEdges.push(edge);
    if (isActive || (isPast && showHistory)) visibleEdges.push({ ...edge, isActive });
  });

  if (currentEngine === 'vis') renderVisData(visibleEdges); else executeMermaidRender(generateMermaidDef(visibleEdges));
  updateLegend();

  document.getElementById('tree-container').innerHTML = `<strong>${ROOT_ID}</strong>` + buildTreeHTML(ROOT_ID, activeEdges);

  const parentSelect = document.getElementById('parent-select');
  const removeSelect = document.getElementById('remove-select');
  parentSelect.innerHTML = ''; removeSelect.innerHTML = '';

  const activeNodes = new Set([ROOT_ID]);
  activeEdges.forEach(e => { activeNodes.add(e.from); activeNodes.add(e.to); });
  activeNodes.forEach(id => { const opt = document.createElement('option'); opt.value = id; opt.innerText = id; parentSelect.appendChild(opt); });
  activeEdges.forEach(e => { const opt = document.createElement('option'); opt.value = e.id; opt.innerText = `${e.from} → ${e.to}`; removeSelect.appendChild(opt); });

  const storageTag = document.getElementById('storage-paradigm-tag');
  const storageContent = document.getElementById('storage-content');
  storageTag.innerText = `SMS / ${currentOntology} / ${currentMode}`;

  if (currentOntology === 'BFO') {
    if (currentMode === 'LPG') {
      let html = `<table><thead><tr><th>${t.sourceCol}</th><th>${t.targetCol}</th><th>valid_from</th><th>valid_to</th><th>${t.statusCol}</th></tr></thead><tbody>`;
      edgesStore.forEach(edge => {
        const isActive = (edge.valid_to === null || edge.valid_to > currentTime) && edge.valid_from <= currentTime;
        html += `<tr class="${isActive ? 'active-row' : 'closed-row'}"><td>${edge.from}</td><td><strong>${edge.to}</strong></td><td>T${edge.valid_from}</td><td>${edge.valid_to !== null ? 'T' + edge.valid_to : '—'}</td><td>${isActive ? t.activeStatus : t.closedStatus}</td></tr>`;
      });
      html += '</tbody></table>';
      storageContent.innerHTML = html;
    } else {
      let ttl = `# BFO 3D in SMS: RDF Turtle with Reification\n`;
      edgesStore.forEach(e => {
        const isActive = (e.valid_to === null || e.valid_to > currentTime) && e.valid_from <= currentTime;
        if (!isActive && !showHistory) return;
        ttl += `\n_:${e.id} a :TemporalPartMembership ;\n    :hasParent :${e.from} ;\n    :hasChild  :${e.to} ;\n    :validFrom "${e.valid_from}"^^xsd:integer ${e.valid_to !== null ? ';\n    :validTo   "' + e.valid_to + '"^^xsd:integer .' : ' .'}\n`;
      });
      storageContent.innerHTML = `<pre class="code-block">${ttl}</pre>`;
    }
  } else {
    if (currentMode === 'LPG') {
      let html = `<table><thead><tr><th>Parent Slice</th><th>Child Slice</th><th>LPG Rel Properties</th><th>4D Extent</th></tr></thead><tbody>`;
      visibleEdges.forEach(e => {
        const span = e.isActive ? `[T${e.valid_from}..now]` : `[T${e.valid_from}..T${e.valid_to}]`;
        html += `<tr class="${e.isActive ? 'active-row' : 'closed-row'}"><td>${e.from}_State</td><td><strong>${e.to}_State</strong></td><td><code>{qty: 1, rev: '${e.id}', span: '${span}'}</code></td><td>${e.from}_4D, ${e.to}_4D</td></tr>`;
      });
      html += '</tbody></table>';
      storageContent.innerHTML = html;
    } else {
      let ttl = `# ISO 15926-2 in SMS: Pure Binary RDF Triples (Tenseless Composition)\n`;
      visibleEdges.forEach(e => {
        const pState = `:${e.from}_state_${e.id}`, cState = `:${e.to}_state_${e.id}`;
        ttl += `\n:${e.from}_4D a iso:ActualIndividual .\n:${e.to}_4D   a iso:ActualIndividual .\n${pState} a iso:State ;\n    iso:temporalPartOf :${e.from}_4D ;\n    iso:hasPart ${cState} .\n${cState} a iso:State ;\n    iso:temporalPartOf :${e.to}_4D .\n`;
      });
      storageContent.innerHTML = `<pre class="code-block">${ttl}</pre>`;
    }
  }

  const queryContent = document.getElementById('query-content');
  if (currentOntology === 'BFO') {
    if (currentMode === 'LPG') {
      queryContent.innerHTML = `<pre class="code-block" style="color: #0369a1;">// Cypher (Neo4j)
MATCH (p)-[r:has_part]->(c)
WHERE r.valid_from <= ${currentTime} 
  AND (r.valid_to IS NULL OR r.valid_to > ${currentTime})
RETURN p.id AS Parent, c.id AS Child</pre>`;
    } else {
      queryContent.innerHTML = `<pre class="code-block" style="color: #0369a1;"># SPARQL
PREFIX : &lt;http://example.org/&gt;
SELECT ?parent ?child
WHERE {
  ?stmt a :TemporalPartMembership ;
        :hasParent ?parent ;
        :hasChild ?child ;
        :validFrom ?from .
  OPTIONAL { ?stmt :validTo ?to }
  
  FILTER (?from <= ${currentTime} && 
         (!bound(?to) || ?to > ${currentTime}))
}</pre>`;
    }
  } else {
    if (currentMode === 'LPG') {
      queryContent.innerHTML = `<pre class="code-block" style="color: #3730a3;">// Cypher (Neo4j)
MATCH (p_state:State)-[:COMPOSED_OF]->(c_state:State)
WHERE p_state.valid_from <= ${currentTime} 
  AND (p_state.valid_to IS NULL OR p_state.valid_to > ${currentTime})
MATCH (p_state)-[:temporalPartOf]->(p_4d:ActualIndividual)
MATCH (c_state)-[:temporalPartOf]->(c_4d:ActualIndividual)
RETURN p_4d.id AS Parent4D, c_4d.id AS Child4D</pre>`;
    } else {
      queryContent.innerHTML = `<pre class="code-block" style="color: #3730a3;"># SPARQL
PREFIX iso: &lt;http://example.org/iso15926/&gt;
SELECT ?parent4D ?child4D
WHERE {
  ?pState a iso:State ;
          iso:temporalPartOf ?parent4D ;
          iso:hasPart ?cState ;
          iso:validFrom ?from .
  ?cState a iso:State ;
          iso:temporalPartOf ?child4D .
  OPTIONAL { ?pState iso:validTo ?to }
  
  FILTER (?from <= ${currentTime} && 
         (!bound(?to) || ?to > ${currentTime}))
}</pre>`;
    }
  }
}

// === ЛОГИКА РЕСАЙЗА === //

// 1. Горизонтальный ресайз (Граф vs Боковая панель)
const resizerH = document.getElementById('panel-resizer');
const leftSide = document.getElementById('canvas-container');

let mPos = 0;
let leftSideWidth = 0;

function mouseMoveHandlerH(e) {
  const dx = e.clientX - mPos;
  const parentWidth = resizerH.parentNode.getBoundingClientRect().width;
  const newLeftWidth = ((leftSideWidth + dx) * 100) / parentWidth;
  
  if (newLeftWidth > 20 && newLeftWidth < 80) {
    leftSide.style.flex = `0 0 ${newLeftWidth}%`;
  }
}

function mouseUpHandlerH() {
  resizerH.classList.remove('dragging');
  document.body.classList.remove('no-select');
  document.removeEventListener('mousemove', mouseMoveHandlerH);
  document.removeEventListener('mouseup', mouseUpHandlerH);
  if (currentEngine === 'vis') network.redraw();
}

resizerH.addEventListener('mousedown', function (e) {
  mPos = e.clientX;
  leftSideWidth = leftSide.getBoundingClientRect().width;
  document.addEventListener('mousemove', mouseMoveHandlerH);
  document.addEventListener('mouseup', mouseUpHandlerH);
  document.body.classList.add('no-select');
  resizerH.classList.add('dragging');
});

// 2. Вертикальный ресайз 1 (URMSM BOM vs SMS Storage)
const resizerV1 = document.getElementById('resizer-bom-storage');
const cardBom = document.getElementById('card-bom');
let mPosV1 = 0;
let bomHeight = 0;

function mouseMoveHandlerV1(e) {
  const dy = e.clientY - mPosV1;
  const parentHeight = resizerV1.parentNode.getBoundingClientRect().height;
  const newHeight = ((bomHeight + dy) * 100) / parentHeight;
  
  if (newHeight > 10 && newHeight < 80) {
    cardBom.style.flex = `0 0 ${newHeight}%`;
  }
}

function mouseUpHandlerV1() {
  resizerV1.classList.remove('dragging');
  document.body.classList.remove('no-select');
  document.removeEventListener('mousemove', mouseMoveHandlerV1);
  document.removeEventListener('mouseup', mouseUpHandlerV1);
}

resizerV1.addEventListener('mousedown', function (e) {
  mPosV1 = e.clientY;
  bomHeight = cardBom.getBoundingClientRect().height;
  document.addEventListener('mousemove', mouseMoveHandlerV1);
  document.addEventListener('mouseup', mouseUpHandlerV1);
  document.body.classList.add('no-select');
  resizerV1.classList.add('dragging');
});

// 3. Вертикальный ресайз 2 (SMS Storage vs DB Query)
const resizerV2 = document.getElementById('resizer-storage-query');
const cardStorage = document.getElementById('card-storage');
let mPosV2 = 0;
let storageHeight = 0;

function mouseMoveHandlerV2(e) {
  const dy = e.clientY - mPosV2;
  const parentHeight = resizerV2.parentNode.getBoundingClientRect().height;
  const newHeight = ((storageHeight + dy) * 100) / parentHeight;
  
  if (newHeight > 10 && newHeight < 80) {
    cardStorage.style.flex = `0 0 ${newHeight}%`;
  }
}

function mouseUpHandlerV2() {
  resizerV2.classList.remove('dragging');
  document.body.classList.remove('no-select');
  document.removeEventListener('mousemove', mouseMoveHandlerV2);
  document.removeEventListener('mouseup', mouseUpHandlerV2);
}

resizerV2.addEventListener('mousedown', function (e) {
  mPosV2 = e.clientY;
  storageHeight = cardStorage.getBoundingClientRect().height;
  document.addEventListener('mousemove', mouseMoveHandlerV2);
  document.addEventListener('mouseup', mouseUpHandlerV2);
  document.body.classList.add('no-select');
  resizerV2.classList.add('dragging');
});

// Инициализация
addPart(ROOT_ID, 'SubAssembly_1', true);
addPart(ROOT_ID, 'Part_A', true);
addPart('SubAssembly_1', 'Sensor_X', true);

setLanguage('sv');