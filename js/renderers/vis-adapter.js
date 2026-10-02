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
  if (network) {
    network.destroy();
    network = null;
  }
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

  // 1. Map and style Nodes directly from the Semantic Graph (pure renderer)
  const styledNodes = (semanticGraph.nodes || []).map(node => {
    const style = getNodeStyle(node);
    
    // Display custom properties directly on the node label if present
    let displayLabel = node.label || node.id;
    if (node.properties) {
      const customProps = Object.entries(node.properties).filter(
        ([k]) => !['isCurrent', 'originalId', 'entityType', 'validFrom', 'validTo', 'ownerId'].includes(k)
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

      // Display custom properties directly on the edge label if present
      let displayEdgeLabel = edge.label;
      if (edge.properties) {
        const customEdgeProps = Object.entries(edge.properties).filter(
          ([k]) => !['isCurrent', 'validFrom', 'validTo'].includes(k)
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
  const entityType = node.type || node.properties?.entityClass || node.properties?.entityType;

  switch (entityType) {
    // Specific Manufacturing Domain Classes (Naive Mode)
    case 'Vehicle':
      return {
        shape: 'box',
        color: '#0284c7', // Blue
        font: { color: '#ffffff', bold: true }
      };

    case 'Slot':
      return {
        shape: 'box',
        color: '#64748b', // Grey
        font: { color: '#ffffff' }
      };

    case 'Part':
      return {
        shape: 'box',
        color: '#10b981', // Green
        font: { color: '#ffffff', bold: true }
      };

    case 'Defect':
      return {
        shape: 'diamond',
        size: 25,
        color: '#ef4444', // Red
        font: { color: '#ffffff', bold: true }
      };

    case 'Warehouse':
      return {
        shape: 'box',
        color: '#f97316', // Orange
        font: { color: '#ffffff', bold: true }
      };

    // BFO 3D Continuants
    case 'MaterialEntity': {
      const isSystem = node.properties?.entityType === 'system';
      return {
        shape: 'box',
        color: isSystem ? '#0284c7' : '#64748b', // Blue for System, Slate for Element
        font: { color: '#ffffff', bold: isSystem }
      };
    }

    case 'Quality':
    case 'DependentContinuant':
      return {
        shape: 'diamond',
        size: 25,
        color: '#f59e0b', // Amber / orange for Dependent Continuant
        font: { color: '#000000', bold: true }
      };

    // W3C RDF Reification and Literals (SMS physical layer)
    case 'RelationalQuality':
    case 'TemporalPartMembership': {
      const isStmtActive = node.properties?.isCurrent !== false;
      return {
        shape: 'diamond',
        size: 15,
        color: isStmtActive ? '#f59e0b' : '#e2e8f0', // Amber if active, light grey if past
        font: { size: 10, color: isStmtActive ? '#000000' : '#64748b', bold: true }
      };
    }

    case 'Literal':
      return {
        shape: 'ellipse', // Oval shape
        color: '#f8fafc',
        font: { size: 8, color: '#334155' }
      };

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

/**
 * Determines the visual style of an edge based on its ontological type and temporal validity.
 * 
 * @param {Object} edge - Canonical semantic edge with properties.
 * @returns {Object} Vis.js edge styling object.
 */
function getEdgeStyle(edge) {
  const isCurrent = edge.properties?.isCurrent !== false;

  switch (edge.type) {
    case 'has_slot':
      return {
        color: isCurrent ? { color: '#0284c7' } : { color: '#cbd5e1' }, // Blue
        dashes: !isCurrent,
        width: isCurrent ? 2 : 1
      };

    case 'mounted_in':
      return {
        color: isCurrent ? { color: '#10b981' } : { color: '#cbd5e1' }, // Green
        dashes: !isCurrent,
        width: isCurrent ? 2 : 1
      };

    case 'stored_at':
      return {
        color: isCurrent ? { color: '#f97316' } : { color: '#cbd5e1' }, // Orange
        dashes: !isCurrent,
        width: isCurrent ? 2 : 1
      };

    case 'has_defect':
      return {
        color: isCurrent ? { color: '#ef4444' } : { color: '#cbd5e1' }, // Red
        dashes: !isCurrent,
        width: 2
      };

    case 'inherence':
      return {
        color: isCurrent ? { color: '#f59e0b' } : { color: '#cbd5e1' }, // Amber for inheres_in
        dashes: !isCurrent,
        width: 2
      };

    case 'composition':
    case 'has_part':
      return {
        color: isCurrent ? { color: '#10b981' } : { color: '#cbd5e1' }, // Emerald active, Slate past
        dashes: !isCurrent,
        width: isCurrent ? 2 : 1
      };

    case 'transition':
      return {
        color: { color: '#f59e0b' }, // Amber for LPG state transitions
        dashes: false,
        width: 2
      };

    case 'classification':
    case 'reification':
    case 'predicate':
      return {
        color: { color: '#94a3b8' }, // Subtle slate for structural 4D or RDF links
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