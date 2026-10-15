/**
 * VIS.JS RENDERER ADAPTER
 * -----------------------
 * Bridges the abstract Semantic Graph with Vis.js Network.
 * Uses incremental DataSet diffing so the graph layout stays stable across time steps.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';

let network = null;
const visNodes = new vis.DataSet();
const visEdges = new vis.DataSet();

/**
 * Initialises the Vis.js network instance in the specified DOM container.
 *
 * @param {HTMLElement} container - The DOM element to host the canvas.
 */
export function initVisNetwork(container) {
  if (!container) return;
  if (network) {
    network.destroy();
    network = null;
  }
  visNodes.clear();
  visEdges.clear();
  const data = { nodes: visNodes, edges: visEdges };
  network = new vis.Network(container, data, getBaseOptions(false));
}

/**
 * Updates the network with a new Semantic Graph using non-destructive DataSet diffing.
 *
 * @param {Object} semanticGraph - { nodes: [], edges: [] }
 * @param {boolean} isComplex - Flag to adjust physics for denser graphs.
 */
export function updateVisNetwork(semanticGraph, isComplex = false) {
  if (!network || !semanticGraph) return;

  network.setOptions(getBaseOptions(isComplex));

  // 1. Map and style Nodes
  const incomingNodeIds = new Set();
  const styledNodes = (semanticGraph.nodes || []).map(node => {
    incomingNodeIds.add(node.id);
    const style = getNodeStyle(node);

    let displayLabel = node.label || node.id;
    if (node.properties) {
      const customProps = Object.entries(node.properties).filter(
        ([k, v]) => !INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null
      );
      if (customProps.length > 0) {
        const propStr = customProps.map(([k, v]) => `${k}: ${v}`).join(', ');
        displayLabel = `${displayLabel}\n{${propStr}}`;
      }
    }

    const styledNode = {
      id: node.id,
      label: displayLabel,
      shape: style.shape,
      color: style.color,
      font: style.font,
      borderWidth: 1.5
    };

    if (style.size !== undefined) {
      styledNode.size = style.size;
    }
    if (style.shape === 'box' || style.shape === 'ellipse') {
      styledNode.margin = 10;
    }

    return styledNode;
  });

  // Remove obsolete nodes and update/add current nodes
  const existingNodeIds = visNodes.getIds();
  const nodesToRemove = existingNodeIds.filter(id => !incomingNodeIds.has(id));
  if (nodesToRemove.length > 0) visNodes.remove(nodesToRemove);
  if (styledNodes.length > 0) visNodes.update(styledNodes);

  // 2. Map and style Edges
  const pairMap = {};
  (semanticGraph.edges || []).forEach(edge => {
    const pairKey = `${edge.from}->${edge.to}`;
    if (!pairMap[pairKey]) pairMap[pairKey] = [];
    pairMap[pairKey].push(edge);
  });

  const incomingEdgeIds = new Set();
  const styledEdges = [];

  Object.values(pairMap).forEach(edgesGroup => {
    const count = edgesGroup.length;

    edgesGroup.forEach((edge, idx) => {
      incomingEdgeIds.add(edge.id);
      const smoothConfig = count === 1
        ? { type: 'continuous', roundness: 0.2 }
        : { type: 'curvedCW', roundness: Math.min(0.14 + (idx * 0.14), 0.85) };

      const style = getEdgeStyle(edge);

      let displayEdgeLabel = edge.label || '';
      if (edge.properties) {
        const customEdgeProps = Object.entries(edge.properties).filter(
          ([k, v]) => !INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null
        );
        if (customEdgeProps.length > 0) {
          const propStr = customEdgeProps.map(([k, v]) => `${k}: ${v}`).join(', ');
          displayEdgeLabel = `${displayEdgeLabel} {${propStr}}`;
        }
      }

      styledEdges.push({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: displayEdgeLabel,
        color: style.color,
        dashes: style.dashes,
        width: style.width,
        smooth: smoothConfig,
        font: { size: 10, align: 'middle', background: '#ffffff', strokeWidth: 0 }
      });
    });
  });

  const existingEdgeIds = visEdges.getIds();
  const edgesToRemove = existingEdgeIds.filter(id => !incomingEdgeIds.has(id));
  if (edgesToRemove.length > 0) visEdges.remove(edgesToRemove);
  if (styledEdges.length > 0) visEdges.update(styledEdges);
}

function getNodeStyle(node) {
  const entityType = node.type || node.properties?.entityClass || node.properties?.entityType;

  switch (entityType) {
    case 'Vehicle':
      return { shape: 'box', color: '#0284c7', font: { color: '#ffffff', bold: true } };
    case 'Slot':
      return { shape: 'box', color: '#64748b', font: { color: '#ffffff' } };
    case 'Part':
      return { shape: 'box', color: '#10b981', font: { color: '#ffffff', bold: true } };
    case 'Defect':
      return { shape: 'diamond', size: 25, color: '#ef4444', font: { color: '#ffffff', bold: true } };
    case 'Warehouse':
      return { shape: 'box', color: '#f97316', font: { color: '#ffffff', bold: true } };
    case 'MaterialEntity': {
      const isSystem = node.properties?.entityType === 'system' || node.properties?.entityClass === 'Vehicle';
      return {
        shape: 'box',
        color: isSystem ? '#0284c7' : '#64748b',
        font: { color: '#ffffff', bold: isSystem }
      };
    }
    case 'Quality':
    case 'DependentContinuant':
      return { shape: 'diamond', size: 25, color: '#f59e0b', font: { color: '#000000', bold: true } };
    case 'RelationalQuality':
    case 'TemporalPartMembership': {
      const isStmtActive = node.properties?.isCurrent !== false;
      return {
        shape: 'diamond',
        size: 16,
        color: isStmtActive ? '#f59e0b' : '#e2e8f0',
        font: { size: 10, color: isStmtActive ? '#000000' : '#64748b', bold: true }
      };
    }
    case 'Literal':
      return { shape: 'ellipse', color: '#f8fafc', font: { size: 9, color: '#334155' } };
    case 'ActualIndividual':
      return { shape: 'box', color: '#4f46e5', font: { color: '#ffffff', bold: true } };
    case 'State': {
      const isStateActive = node.properties?.isCurrent !== false;
      return {
        shape: 'box',
        color: isStateActive ? '#0d9488' : '#94a3b8',
        font: { color: '#ffffff' }
      };
    }
    default: {
      if (/^def/i.test(node.id)) {
        return { shape: 'diamond', color: '#ef4444', font: { color: '#ffffff', bold: true } };
      }
      if (/^qual/i.test(node.id)) {
        return { shape: 'diamond', color: '#f59e0b', font: { color: '#000000', bold: true } };
      }
      return { shape: 'box', color: '#94a3b8', font: { color: '#ffffff' } };
    }
  }
}

function getEdgeStyle(edge) {
  const isCurrent = edge.properties?.isCurrent !== false;
  const rel = edge.type || edge.label;

  if (!isCurrent) {
    return { color: { color: '#cbd5e1' }, dashes: true, width: 1 };
  }

  switch (rel) {
    case 'has_slot':
      return { color: { color: '#0284c7' }, dashes: false, width: 2 };
    case 'mounted_in':
    case 'composition':
    case 'has_part':
      return { color: { color: '#10b981' }, dashes: false, width: 2 };
    case 'stored_at':
      return { color: { color: '#f97316' }, dashes: false, width: 2 };
    case 'has_defect':
      return { color: { color: '#ef4444' }, dashes: false, width: 2 };
    case 'inherence':
      return { color: { color: '#f59e0b' }, dashes: false, width: 2 };
    case 'transition':
      return { color: { color: '#f59e0b' }, dashes: false, width: 2 };
    case 'classification':
    case 'reification':
    case 'predicate':
      return { color: { color: '#94a3b8' }, dashes: true, width: 1 };
    default:
      return { color: { color: '#94a3b8' }, dashes: false, width: 1 };
  }
}

function getBaseOptions(isComplex) {
  return {
    physics: {
      stabilization: { iterations: 80, fit: true },
      barnesHut: {
        gravitationalConstant: isComplex ? -22000 : -10000,
        centralGravity: 0.25,
        springLength: isComplex ? 200 : 140,
        springConstant: 0.04,
        damping: 0.12,
        avoidOverlap: 0.9
      }
    },
    edges: { arrows: 'to' }
  };
}