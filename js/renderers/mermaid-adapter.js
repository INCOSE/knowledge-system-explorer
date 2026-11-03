/**
 * MERMAID RENDERER ADAPTER
 * ------------------------
 * Translates the abstract Semantic Graph into Mermaid flowchart syntax
 * with distinct shapes & colours for Recorded Facts vs Inferred Knowledge.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';

let isRendering = false;
let pendingDefinition = null;
let renderCounter = 0;
let panZoomInstance = null;

export async function updateMermaidNetwork(semanticGraph, container) {
  if (!container) return;

  if (!semanticGraph || !Array.isArray(semanticGraph.nodes) || semanticGraph.nodes.length === 0) {
    if (panZoomInstance) {
      panZoomInstance.destroy();
      panZoomInstance = null;
    }
    container.innerHTML = `<div style="margin: auto; color: #94a3b8; font-size: 13px; font-weight: 500;">Empty Graph Canvas (T = 0)</div>`;
    return;
  }

  const chartDefinition = buildMermaidDefinition(semanticGraph);

  if (isRendering) {
    pendingDefinition = chartDefinition;
    return;
  }

  await executeRender(chartDefinition, container);
}

async function executeRender(definition, container) {
  isRendering = true;
  try {
    const renderId = 'mermaid_svg_' + (++renderCounter);
    const { svg } = await mermaid.render(renderId, definition);
    container.innerHTML = svg;

    if (panZoomInstance) {
      panZoomInstance.destroy();
      panZoomInstance = null;
    }

    const svgElement = container.querySelector('svg');
    if (svgElement && window.svgPanZoom) {
      svgElement.style.width = '100%';
      svgElement.style.height = '100%';
      svgElement.style.maxWidth = 'none';

      panZoomInstance = svgPanZoom(svgElement, {
        zoomEnabled: true,
        controlIconsEnabled: true,
        fit: true,
        center: true,
        minZoom: 0.1,
        maxZoom: 10
      });
    }
  } catch (err) {
    console.error('[Mermaid Adapter] Render Error:', err);
  } finally {
    isRendering = false;
    if (pendingDefinition) {
      const next = pendingDefinition;
      pendingDefinition = null;
      await executeRender(next, container);
    }
  }
}

function buildMermaidDefinition(semanticGraph) {
  let def = `%%{init: {"flowchart": {"defaultRenderer": "elk"}} }%%\nflowchart TD\n`;
  def += '  classDef default fill:#f8fafc,stroke:#cbd5e1,color:#334155,stroke-width:1px\n';
  def += '  classDef bfoSys fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px\n';
  def += '  classDef bfoElem fill:#475569,stroke:#334155,color:#ffffff,stroke-width:1px\n';
  def += '  classDef bfoSlot fill:#e0e7ff,stroke:#4f46e5,color:#1e1b4b,stroke-width:2px,stroke-dasharray:4 3\n';
  def += '  classDef bfoQuality fill:#f59e0b,stroke:#d97706,color:#000000,stroke-width:2px\n';
  def += '  classDef rdfStmt fill:#f59e0b,stroke:#d97706,color:#000000,stroke-width:1px\n';
  def += '  classDef rdfLit fill:#f1f5f9,stroke:#cbd5e1,color:#334155,stroke-dasharray:3 3\n';
  def += '  classDef iso4d fill:#4f46e5,stroke:#3730a3,color:#ffffff,stroke-width:2px\n';
  def += '  classDef isoState fill:#0d9488,stroke:#0f766e,color:#ffffff,stroke-width:1px\n';
  def += '  classDef isoStatePast fill:#94a3b8,stroke:#64748b,color:#ffffff,stroke-width:1px,stroke-dasharray:3 3\n';
  def += '  classDef naiveVehicle fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px\n';
  def += '  classDef naiveSlot fill:#64748b,stroke:#475569,color:#ffffff,stroke-width:1px\n';
  def += '  classDef naivePart fill:#10b981,stroke:#059669,color:#ffffff,stroke-width:2px\n';
  def += '  classDef naiveDefect fill:#ef4444,stroke:#b91c1c,color:#ffffff,stroke-width:2px\n';
  def += '  classDef naiveWarehouse fill:#f97316,stroke:#ea580c,color:#ffffff,stroke-width:2px\n';
  // Distinct Inferred Knowledge & Wisdom Styles
  def += '  classDef infStress fill:#7c3aed,stroke:#5b21b6,color:#ffffff,stroke-width:2px,stroke-dasharray:5 2\n';
  def += '  classDef infHazard fill:#be123c,stroke:#881337,color:#ffffff,stroke-width:2.5px,stroke-dasharray:6 2\n';
  def += '  classDef wisdomDir fill:#059669,stroke:#065f46,color:#ffffff,stroke-width:3px\n';
  def += '  classDef blindSpot fill:#fef08a,stroke:#ca8a04,color:#713f12,stroke-width:2.5px,stroke-dasharray:4 2\n\n';

  (semanticGraph.nodes || []).forEach(node => {
    const safeId = sanitizeId(node.id);
    const styleClass = getNodeClass(node);
    let labelText = node.label || node.id;

    if (node.properties) {
      const customProps = Object.entries(node.properties).filter(
        ([k, v]) => !INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null
      );
      if (customProps.length > 0) {
        const propStr = customProps.map(([k, v]) => `${k}: ${v}`).join(', ');
        labelText = `${labelText} {${propStr}}`;
      }
    }

    const safeLabel = labelText
      .replace(/\n/g, '<br/>')
      .replace(/"/g, '&quot;');

    const isSlotNode = node.id.startsWith('Slot_') || node.properties?.entityClass === 'Slot' || node.type === 'Slot';
    let entityType = node.type || node.properties?.entityClass;

    if (entityType === 'MaterialEntity' && isSlotNode) {
      entityType = 'BFO:Site (Slot)';
    }

    // Distinct Mermaid geometry per ontological / inference role
    let shapeOpen = '["';
    let shapeClose = '"]';

    if (entityType === 'InferredStress') {
      // Subroutine shape [[...]] for inferred stress state
      shapeOpen = '[["🧠 ';
      shapeClose = '"]]';
    } else if (entityType === 'InferredHazard') {
      // Hexagon shape {{...}} for inferred fracture / hazard
      shapeOpen = '{{"⚡ ';
      shapeClose = '"}}';
    } else if (entityType === 'WisdomDirective') {
      // Trapezoid [/...\] for actionable wisdom directive
      shapeOpen = '[/"✅ ';
      shapeClose = '"\\]';
    } else if (entityType === 'BlindSpot') {
      // Parallelogram [/.../] for unmapped blind spot warning
      shapeOpen = '[/"⚠️ ';
      shapeClose = '"/]';
    } else if (entityType === 'TemporalPartMembership' || entityType === 'RelationalQuality' || entityType === 'Defect' || /^def/i.test(node.id)) {
      // Recorded Defect
      shapeOpen = '{{"🔧 ';
      shapeClose = '"}}';
    } else if (entityType === 'Literal' || entityType === 'Quality' || entityType === 'DependentContinuant' || /^qual/i.test(node.id)) {
      // Recorded BFO Quality
      shapeOpen = '(["🔍 ';
      shapeClose = '"])';
    }

    def += `  ${safeId}${shapeOpen}<b>${safeLabel}</b><br/><i>${entityType || 'Node'}</i>${shapeClose}:::${styleClass}\n`;
  });

  def += '\n';

  const linkStyles = [];
  (semanticGraph.edges || []).forEach((edge, idx) => {
    const safeFrom = sanitizeId(edge.from);
    const safeTo = sanitizeId(edge.to);
    const isCurrent = edge.properties?.isCurrent !== false;

    let linkArrow = '-->';
    if (edge.type === 'transition') {
      linkArrow = '==>';
    } else if (edge.type === 'inference' || !isCurrent || edge.type === 'classification' || edge.type === 'reification' || edge.type === 'predicate') {
      linkArrow = '-.->';
    }

    let rawLabel = edge.label || '';
    if (edge.properties) {
      const customEdgeProps = Object.entries(edge.properties).filter(
        ([k, v]) => !INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null
      );
      if (customEdgeProps.length > 0) {
        const propStr = customEdgeProps.map(([k, v]) => `${k}: ${v}`).join(', ');
        rawLabel = `${rawLabel}\\n{${propStr}}`;
      }
    }

    const safeEdgeLabel = rawLabel.replace(/"/g, "'");
    def += `  ${safeFrom} ${linkArrow}|"${safeEdgeLabel}"| ${safeTo}\n`;

    const style = getMermaidEdgeStyle(edge);
    let styleDecl = `stroke:${style.stroke},stroke-width:${style.width}px`;
    if (style.dash) {
      styleDecl += `,stroke-dasharray:${style.dash}`;
    }
    linkStyles.push(`  linkStyle ${idx} ${styleDecl};`);
  });

  if (linkStyles.length > 0) {
    def += '\n' + linkStyles.join('\n') + '\n';
  }

  return def;
}

function getMermaidEdgeStyle(edge) {
  const isCurrent = edge.properties?.isCurrent !== false;

  if (!isCurrent) {
    return { stroke: '#94a3b8', width: 1, dash: '4 4' };
  }

  const rel = (edge.type || '').toLowerCase();
  const label = (edge.label || '').toLowerCase();

  if (rel === 'inference') {
    return { stroke: '#8b5cf6', width: 2.5, dash: '5 3' };
  }
  if (rel === 'has_defect' || label === 'has_defect' || label === 'defect') {
    return { stroke: '#ef4444', width: 2.5 };
  }
  if (rel === 'inherence' || label === 'inheres_in') {
    return { stroke: '#f59e0b', width: 2 };
  }
  if (rel === 'has_slot' || label === 'has_slot') {
    return { stroke: '#0284c7', width: 2 };
  }
  if (rel === 'mounted_in' || label === 'mounted_in' || rel === 'composition' || rel === 'has_part' || label === 'has_part') {
    return { stroke: '#10b981', width: 2 };
  }
  if (rel === 'stored_at' || label === 'stored_at') {
    return { stroke: '#f97316', width: 2 };
  }
  if (rel === 'transition') {
    return { stroke: '#f59e0b', width: 2 };
  }
  if (rel === 'classification' || rel === 'reification' || rel === 'predicate' || label === 'temporalpartof') {
    return { stroke: '#94a3b8', width: 1, dash: '3 3' };
  }

  return { stroke: '#94a3b8', width: 1 };
}

function getNodeClass(node) {
  const entityType = node.type || node.properties?.entityClass || node.properties?.entityType;
  const isSlotNode = node.id.startsWith('Slot_') || node.properties?.entityClass === 'Slot' || node.type === 'Slot';

  switch (entityType) {
    case 'InferredStress':
      return 'infStress';
    case 'InferredHazard':
      return 'infHazard';
    case 'WisdomDirective':
      return 'wisdomDir';
    case 'BlindSpot':
      return 'blindSpot';
    case 'Vehicle':
      return 'naiveVehicle';
    case 'Slot':
      return 'naiveSlot';
    case 'Part':
      return 'naivePart';
    case 'Defect':
      return 'naiveDefect';
    case 'Warehouse':
      return 'naiveWarehouse';
    case 'MaterialEntity':
      if (isSlotNode) return 'bfoSlot';
      return (node.properties?.entityType === 'system' || node.properties?.entityClass === 'Vehicle')
        ? 'bfoSys'
        : 'bfoElem';
    case 'Quality':
    case 'DependentContinuant':
      return 'bfoQuality';
    case 'RelationalQuality':
    case 'TemporalPartMembership':
      return 'rdfStmt';
    case 'Literal':
      return 'rdfLit';
    case 'ActualIndividual':
      return 'iso4d';
    case 'State':
      return node.properties?.isCurrent === false ? 'isoStatePast' : 'isoState';
    default:
      if (/^def/i.test(node.id)) return 'naiveDefect';
      if (/^qual/i.test(node.id)) return 'bfoQuality';
      return 'default';
  }
}

function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_]/g, '_');
}