/**
 * VIS.JS RENDERER ADAPTER
 * -----------------------
 * This module is responsible for bridging the abstract Semantic Graph
 * with the visual representations required by the Vis.js Network library.
 * It strictly handles styling (colours, shapes, physics) based on node/edge types.
 */

// We assume 'vis' is available globally via the CDN imported in index.html.
let network = null;
const visNodes = new vis.DataSet();
const visEdges = new vis.DataSet();

/**
 * Initialises the Vis.js network instance in the specified DOM container.
 * 
 * @param {HTMLElement} container - The DOM element to host the canvas.
 */
export function initVisNetwork(container) {
  const data = { nodes: visNodes, edges: visEdges };
  network = new vis.Network(container, data, getBaseOptions(false));
}

/**
 * Updates the network with a new Semantic Graph.
 * 
 * @param {Object} semanticGraph - { nodes: [], edges: [] }
 * @param {boolean} isComplex - Flag to adjust physics for denser graphs (e.g. ISO 15926 4D).
 */
export function updateVisNetwork(semanticGraph, isComplex = false) {
  if (!network) {
    console.error("[Vis Adapter] Network not initialised. Call initVisNetwork first.");
    return;
  }

  // Update physics options based on graph complexity
  network.setOptions(getBaseOptions(isComplex));

  // Clear existing data
  visNodes.clear();
  visEdges.clear();

  // 1. Map and style Nodes
  const styledNodes = semanticGraph.nodes.map(node => {
    const style = getNodeStyle(node);
    return {
      id: node.id,
      label: node.label,
      shape: style.shape,
      color: style.color,
      font: style.font,
      size: style.size,
      margin: 10,
      borderWidth: 1.5
    };
  });
  visNodes.add(styledNodes);

  // 2. Map and style Edges
  // We need to handle overlapping edges (multiple events between same parent/child)
  const pairMap = {};
  semanticGraph.edges.forEach(edge => {
    const pairKey = `${edge.from}->${edge.to}`;
    if (!pairMap[pairKey]) pairMap[pairKey] = [];
    pairMap[pairKey].push(edge);
  });

  const styledEdges = [];
  Object.values(pairMap).forEach(edgesGroup => {
    const count = edgesGroup.length;
    
    edgesGroup.forEach((edge, idx) => {
      // Create a smooth curve if multiple edges exist between the same nodes
      const smoothConfig = count === 1 
        ? { type: 'continuous', roundness: 0.2 }
        : { type: 'curvedCW', roundness: Math.min(0.14 + (idx * 0.14), 0.85) };

      const style = getEdgeStyle(edge);

      styledEdges.push({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        color: style.color,
        dashes: style.dashes,
        width: style.width,
        smooth: smoothConfig,
        font: { size: 10, align: 'middle', background: '#ffffff', strokeWidth: 0 }
      });
    });
  });

  visEdges.add(styledEdges);
}

/**
 * Determines the visual style of a node based on its ontological type.
 * Only handles canonical 3D (BFO) and 4D (ISO 15926) domain entities.
 * 
 * @param {Object} node - Canonical semantic node.
 * @returns {Object} Vis.js node styling object.
 */
function getNodeStyle(node) {
  switch (node.type) {
    // BFO 3D Continuants
    case 'MaterialEntity': {
      const isSystem = node.properties?.entityType === 'system';
      return {
        shape: 'box',
        color: isSystem ? '#0284c7' : '#64748b', // Blue for System, Slate for Element
        font: { color: '#ffffff', bold: isSystem }
      };
    }

    // ISO 15926 4D Perdurants
    case 'ActualIndividual':
      return {
        shape: 'box',
        color: '#4f46e5', // Indigo
        font: { color: '#ffffff', bold: true }
      };

    case 'State':
      return {
        shape: 'box',
        color: '#0d9488', // Teal
        font: { color: '#ffffff' }
      };

    default:
      return { shape: 'box', color: '#94a3b8', font: { color: '#ffffff' } };
  }
}

/**
 * Determines the visual style of an edge based on its ontological type and temporal validity.
 * 
 * @param {Object} edge - Canonical semantic edge with properties.
 * @returns {Object} Vis.js edge styling object.
 */
function getEdgeStyle(edge) {
  const isCurrent = edge.properties?.isCurrent !== false;

  switch (edge.type) {
    case 'composition':
      return {
        color: isCurrent ? { color: '#10b981' } : { color: '#cbd5e1' }, // Emerald active, Slate past
        dashes: !isCurrent,
        width: isCurrent ? 2 : 1
      };

    case 'classification':
      return {
        color: { color: '#94a3b8' }, // Subtle slate for structural 4D temporalPartOf links
        dashes: !isCurrent,
        width: 1
      };

    default:
      return { color: { color: '#94a3b8' }, dashes: !isCurrent, width: 1 };
  }
}

/**
 * Generates the physics configuration for the Vis.js canvas.
 */
function getBaseOptions(isComplex) {
  return {
    physics: {
      stabilization: { iterations: 120 },
      barnesHut: { 
        gravitationalConstant: isComplex ? -24000 : -10000, 
        centralGravity: 0.25, 
        springLength: isComplex ? 220 : 150, 
        springConstant: 0.04, 
        damping: 0.09, 
        avoidOverlap: 1 
      }
    },
    edges: { arrows: 'to' }
  };
}