/**
 * VIS.JS RENDERER ADAPTER
 * -----------------------
 * Renders the Semantic Graph using vis-network with distinct visual styling
 * for Recorded Facts vs Inferred Knowledge (Stress, Hazards, Directives, Blind Spots).
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';

let network = null;
let nodesDataSet = null;
let edgesDataSet = null;

export function initVisNetwork(container) {
  if (!container || typeof vis === 'undefined') return;

  nodesDataSet = new vis.DataSet([]);
  edgesDataSet = new vis.DataSet([]);

  const options = {
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -3200,
        centralGravity: 0.25,
        springLength: 145,
        springConstant: 0.04,
        damping: 0.15
      },
      stabilization: { iterations: 120 }
    },
    interaction: {
      hover: true,
      navigationButtons: false,
      keyboard: false
    },
    edges: {
      smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.35 },
      font: { size: 11, color: '#334155', background: 'rgba(255,255,255,0.85)', strokeWidth: 0 }
    },
    nodes: {
      font: { size: 12, face: 'Inter, system-ui, sans-serif', multi: 'html' },
      margin: 10
    }
  };

  network = new vis.Network(container, { nodes: nodesDataSet, edges: edgesDataSet }, options);
}

export function updateVisNetwork(semanticGraph, isComplex = false) {
  if (!network || !nodesDataSet || !edgesDataSet) return;

  const visNodes = (semanticGraph.nodes || []).map(node => {
    const style = getVisNodeStyle(node);
    let labelText = node.label || node.id;

    if (node.properties) {
      const customProps = Object.entries(node.properties).filter(
        ([k, v]) => !INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null
      );
      if (customProps.length > 0) {
        const propStr = customProps.map(([k, v]) => `${k}: ${v}`).join(', ');
        labelText += `\n{${propStr}}`;
      }
    }

    const isSlotNode = node.id.startsWith('Slot_') || node.properties?.entityClass === 'Slot' || node.type === 'Slot';
    let entityType = node.type || node.properties?.entityClass || 'Node';
    if (entityType === 'MaterialEntity' && isSlotNode) {
      entityType = 'BFO:Site (Slot)';
    }

    return {
      id: node.id,
      label: `<b>${labelText}</b>\n<i>(${entityType})</i>`,
      shape: style.shape,
      color: {
        background: style.bg,
        border: style.border,
        highlight: { background: style.bg, border: '#0f172a' }
      },
      font: { color: style.textColor },
      borderWidth: style.borderWidth || 2,
      shapeProperties: { borderDashes: style.dashes || false }
    };
  });

  const visEdges = (semanticGraph.edges || []).map((edge, idx) => {
    const style = getVisEdgeStyle(edge);
    let rawLabel = edge.label || '';
    if (edge.properties) {
      const customEdgeProps = Object.entries(edge.properties).filter(
        ([k, v]) => !INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null
      );
      if (customEdgeProps.length > 0) {
        const propStr = customEdgeProps.map(([k, v]) => `${k}: ${v}`).join(', ');
        rawLabel = `${rawLabel}\n{${propStr}}`;
      }
    }

    return {
      id: edge.id || `vis_e_${idx}_${edge.from}_${edge.to}`,
      from: edge.from,
      to: edge.to,
      label: rawLabel,
      arrows: 'to',
      color: { color: style.color, highlight: style.color },
      width: style.width,
      dashes: style.dashes
    };
  });

  nodesDataSet.clear();
  edgesDataSet.clear();
  nodesDataSet.add(visNodes);
  edgesDataSet.add(visEdges);
}

function getVisNodeStyle(node) {
  const entityType = node.type || node.properties?.entityClass || node.properties?.entityType;
  const isSlotNode = node.id.startsWith('Slot_') || node.properties?.entityClass === 'Slot' || node.type === 'Slot';

  switch (entityType) {
    case 'InferredStress':
      return { shape: 'box', bg: '#7c3aed', border: '#5b21b6', textColor: '#ffffff', dashes: [5, 3], borderWidth: 2.5 };
    case 'InferredHazard':
      return { shape: 'hexagon', bg: '#be123c', border: '#881337', textColor: '#ffffff', dashes: [6, 2], borderWidth: 3 };
    case 'WisdomDirective':
      return { shape: 'box', bg: '#059669', border: '#065f46', textColor: '#ffffff', dashes: false, borderWidth: 3 };
    case 'BlindSpot':
      return { shape: 'triangle', bg: '#fef08a', border: '#ca8a04', textColor: '#713f12', dashes: [4, 2], borderWidth: 2.5 };
    case 'Vehicle':
      return { shape: 'box', bg: '#0284c7', border: '#0369a1', textColor: '#ffffff' };
    case 'Slot':
      return { shape: 'box', bg: '#64748b', border: '#475569', textColor: '#ffffff', dashes: [4, 3] };
    case 'Part':
      return { shape: 'box', bg: '#10b981', border: '#059669', textColor: '#ffffff' };
    case 'Defect':
      return { shape: 'diamond', bg: '#ef4444', border: '#b91c1c', textColor: '#ffffff' };
    case 'Warehouse':
      return { shape: 'box', bg: '#f97316', border: '#ea580c', textColor: '#ffffff' };
    case 'MaterialEntity':
      if (isSlotNode) {
        return { shape: 'box', bg: '#e0e7ff', border: '#4f46e5', textColor: '#1e1b4b', dashes: [4, 3] };
      }
      return (node.properties?.entityType === 'system' || node.properties?.entityClass === 'Vehicle')
        ? { shape: 'box', bg: '#0284c7', border: '#0369a1', textColor: '#ffffff' }
        : { shape: 'box', bg: '#475569', border: '#334155', textColor: '#ffffff' };
    case 'Quality':
    case 'DependentContinuant':
      return { shape: 'ellipse', bg: '#f59e0b', border: '#d97706', textColor: '#000000' };
    case 'RelationalQuality':
    case 'TemporalPartMembership':
      return { shape: 'diamond', bg: '#f59e0b', border: '#d97706', textColor: '#000000' };
    case 'Literal':
      return { shape: 'box', bg: '#f1f5f9', border: '#cbd5e1', textColor: '#334155', dashes: [3, 3] };
    case 'ActualIndividual':
      return { shape: 'box', bg: '#4f46e5', border: '#3730a3', textColor: '#ffffff' };
    case 'State':
      return node.properties?.isCurrent === false
        ? { shape: 'box', bg: '#94a3b8', border: '#64748b', textColor: '#ffffff', dashes: [3, 3] }
        : { shape: 'box', bg: '#0d9488', border: '#0f766e', textColor: '#ffffff' };
    default:
      return { shape: 'box', bg: '#f8fafc', border: '#cbd5e1', textColor: '#334155' };
  }
}

function getVisEdgeStyle(edge) {
  const isCurrent = edge.properties?.isCurrent !== false;
  if (!isCurrent) {
    return { color: '#94a3b8', width: 1, dashes: [4, 4] };
  }

  const rel = (edge.type || '').toLowerCase();
  const label = (edge.label || '').toLowerCase();

  if (rel === 'inference') {
    return { color: '#8b5cf6', width: 2.5, dashes: [5, 3] };
  }
  if (rel === 'has_defect' || label === 'has_defect' || label === 'defect') {
    return { color: '#ef4444', width: 2.5, dashes: false };
  }
  if (rel === 'inherence' || label === 'inheres_in') {
    return { color: '#f59e0b', width: 2, dashes: false };
  }
  if (rel === 'has_slot' || label === 'has_slot') {
    return { color: '#0284c7', width: 2, dashes: false };
  }
  if (rel === 'mounted_in' || label === 'mounted_in' || rel === 'composition' || rel === 'has_part' || label === 'has_part') {
    return { color: '#10b981', width: 2, dashes: false };
  }
  if (rel === 'stored_at' || label === 'stored_at') {
    return { color: '#f97316', width: 2, dashes: false };
  }
  return { color: '#94a3b8', width: 1.5, dashes: false };
}