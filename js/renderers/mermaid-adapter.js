/**
 * MERMAID RENDERER ADAPTER
 * ------------------------
 * Translates the abstract Semantic Graph into Mermaid flowchart syntax
 * and renders it to the DOM. Like the Vis.js adapter, it relies solely
 * on the abstract node/edge types, decoupled from the domain logic.
 */

// Keep track of rendering state to prevent race conditions from rapid UI clicks
let isRendering = false;
let pendingDefinition = null;
let renderCounter = 0;

/**
 * Updates the Mermaid graph in the specified container.
 * 
 * @param {Object} semanticGraph - { nodes: [], edges: [] }
 * @param {HTMLElement} container - The DOM element to host the SVG.
 */
export async function updateMermaidNetwork(semanticGraph, container) {
  const chartDefinition = buildMermaidDefinition(semanticGraph);

  // If a render is already in progress, queue this definition and exit
  if (isRendering) {
    pendingDefinition = chartDefinition;
    return;
  }

  isRendering = true;

  try {
    const renderId = 'mermaid_svg_' + (++renderCounter);
    // We assume 'mermaid' is globally available from the CDN in index.html
    const { svg } = await mermaid.render(renderId, chartDefinition);
    container.innerHTML = svg;
  } catch (err) {
    console.error("[Mermaid Adapter] Render Error:", err);
  } finally {
    isRendering = false;
    // If a new graph was requested while we were rendering, process it now
    if (pendingDefinition) {
      const nextDefinition = pendingDefinition;
      pendingDefinition = null;
      // We pass a dummy object here because the definition string is already built,
      // but to keep the signature clean for this recursive pattern, it's better
      // to extract the render call. For simplicity, we just rebuild it:
      executePendingRender(nextDefinition, container); 
    }
  }
}

async function executePendingRender(definition, container) {
  isRendering = true;
  try {
    const { svg } = await mermaid.render('mermaid_svg_' + (++renderCounter), definition);
    container.innerHTML = svg;
  } catch (e) {
    console.error(e);
  } finally {
    isRendering = false;
    if (pendingDefinition) {
      const next = pendingDefinition;
      pendingDefinition = null;
      executePendingRender(next, container);
    }
  }
}

/**
 * Builds the string definition for the Mermaid flowchart.
 * Pure renderer for canonical 3D (BFO) and 4D (ISO 15926) graphs.
 * 
 * @param {Object} semanticGraph - Standardised Semantic Graph.
 * @returns {string} Mermaid chart definition string.
 */
function buildMermaidDefinition(semanticGraph) {
  // 1. Initialise the graph direction and styling classes
  let def = 'flowchart TD\n';
  def += '  classDef default fill:#f8fafc,stroke:#cbd5e1,color:#334155,stroke-width:1px\n';
  def += '  classDef bfoSys fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px\n';
  def += '  classDef bfoElem fill:#64748b,stroke:#475569,color:#ffffff,stroke-width:1px\n';
  def += '  classDef bfoQuality fill:#f59e0b,stroke:#d97706,color:#000000,stroke-width:2px\n';
  def += '  classDef rdfStmt fill:#f59e0b,stroke:#d97706,color:#000000,stroke-width:1px\n';
  def += '  classDef rdfLit fill:#f1f5f9,stroke:#cbd5e1,color:#334155,stroke-dasharray:3 3\n';
  def += '  classDef iso4d fill:#4f46e5,stroke:#3730a3,color:#ffffff,stroke-width:2px\n';
  def += '  classDef isoState fill:#0d9488,stroke:#0f766e,color:#ffffff,stroke-width:1px\n';
  def += '  classDef naiveVehicle fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px\n';
  def += '  classDef naiveSlot fill:#64748b,stroke:#475569,color:#ffffff,stroke-width:1px\n';
  def += '  classDef naivePart fill:#10b981,stroke:#059669,color:#ffffff,stroke-width:2px\n';
  def += '  classDef naiveDefect fill:#ef4444,stroke:#dc2626,color:#ffffff,stroke-width:2px\n';
  def += '  classDef naiveWarehouse fill:#f97316,stroke:#ea580c,color:#ffffff,stroke-width:2px\n\n';

  // 2. Add Nodes directly from the Semantic Graph (pure renderer)
  (semanticGraph.nodes || []).forEach(node => {
    const safeId = sanitizeId(node.id);
    const styleClass = getNodeClass(node);
    let labelText = node.label || '';
    if (node.properties) {
      const customProps = Object.entries(node.properties).filter(
        ([k]) => !['isCurrent', 'originalId', 'entityType', 'validFrom', 'validTo', 'ownerId'].includes(k)
      );
      if (customProps.length > 0) {
        const propStr = customProps.map(([k, v]) => `${k}: ${v}`).join(', ');
        labelText = `${labelText} {${propStr}}`;
      }
    }
    const safeLabel = labelText
      .replace(/\n/g, '<br/>')
      .replace(/"/g, '&quot;');

    let shapeOpen = '["';
    let shapeClose = '"]';

    const entityType = node.type || node.properties?.entityClass;
    if (entityType === 'TemporalPartMembership' || entityType === 'RelationalQuality' || entityType === 'Defect' || /^def/i.test(node.id)) {
      shapeOpen = '{{"';  // Rhombus / diamond shape
      shapeClose = '"}}';
    } else if (entityType === 'Literal' || entityType === 'Quality' || entityType === 'DependentContinuant' || /^qual/i.test(node.id)) {
      shapeOpen = '(["'; // Oval / capsule shape for Quality and Literals
      shapeClose = '"])';
    }

    def += `  ${safeId}${shapeOpen}<b>${safeLabel}</b><br/><i>${entityType || 'Node'}</i>${shapeClose}:::${styleClass}\n`;
  });

  def += '\n';

  // 4. Add Edges and collect explicit linkStyle declarations
  const linkStyles = [];
  (semanticGraph.edges || []).forEach((edge, idx) => {
    const safeFrom = sanitizeId(edge.from);
    const safeTo = sanitizeId(edge.to);
    const isCurrent = edge.properties?.isCurrent !== false;

    let linkArrow = '-->';
    if (edge.type === 'transition') {
      linkArrow = '==>'; // Thick arrow for LPG state transitions
    } else if (!isCurrent || edge.type === 'classification' || edge.type === 'reification' || edge.type === 'predicate') {
      linkArrow = '-.->'; // Dashed line for inactive, classification, or reification links
    }

    // Format edge label and append custom properties (e.g. defect observations) if present
    let rawLabel = edge.label || '';
    if (edge.properties) {
      const customEdgeProps = Object.entries(edge.properties).filter(
        ([k]) => !['isCurrent', 'validFrom', 'validTo', 'originalId', 'ownerId', 'entityType', 'childId', 'parentId'].includes(k)
      );
      if (customEdgeProps.length > 0) {
        const propStr = customEdgeProps.map(([k, v]) => `${k}: ${v}`).join(', ');
        rawLabel = `${rawLabel}\\n{${propStr}}`;
      }
    }

    // Escape quotes in the label
    const safeEdgeLabel = rawLabel.replace(/"/g, "'");

    def += `  ${safeFrom} ${linkArrow}|"${safeEdgeLabel}"| ${safeTo}\n`;

    // Calculate edge colour and line styling to match the legend
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

/**
 * Determines the stroke colour, width, and dash style for a Mermaid edge.
 * Perfectly synchronises canvas edge rendering with the UI legend colours.
 * 
 * @param {Object} edge - Canonical semantic edge.
 * @returns {{ stroke: string, width: number, dash?: string }} Styling descriptor.
 */
function getMermaidEdgeStyle(edge) {
  const isCurrent = edge.properties?.isCurrent !== false;

  if (!isCurrent) {
    return { stroke: '#94a3b8', width: 1, dash: '4 4' };
  }

  const rel = (edge.type || '').toLowerCase();
  const label = (edge.label || '').toLowerCase();

  if (rel === 'has_defect' || label === 'has_defect' || label === 'defect') {
    return { stroke: '#ef4444', width: 2 }; // Red
  }

  if (rel === 'inherence' || label === 'inheres_in' || label === 'bearer_of') {
    return { stroke: '#f59e0b', width: 2 }; // Amber
  }

  if (rel === 'has_slot' || label === 'has_slot') {
    return { stroke: '#0284c7', width: 2 }; // Blue
  }

  if (rel === 'mounted_in' || label === 'mounted_in') {
    return { stroke: '#10b981', width: 2 }; // Green
  }

  if (rel === 'stored_at' || label === 'stored_at') {
    return { stroke: '#f97316', width: 2 }; // Orange
  }

  if (rel === 'composition' || rel === 'has_part' || label === 'has_part' || label === 'haspart' || label === 'partof') {
    return { stroke: '#10b981', width: 2 }; // Emerald green
  }

  if (rel === 'transition') {
    return { stroke: '#f59e0b', width: 2 }; // Amber
  }

  if (rel === 'classification' || rel === 'reification' || rel === 'predicate' || label === 'temporalpartof') {
    return { stroke: '#94a3b8', width: 1, dash: '3 3' };
  }

  return { stroke: '#94a3b8', width: 1 };
}

/**
 * Maps ontological node types to Mermaid CSS classes.
 */
function getNodeClass(node) {
  const entityType = node.type || node.properties?.entityClass || node.properties?.entityType;

  switch (entityType) {
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
      return node.properties?.entityType === 'system' ? 'bfoSys' : 'bfoElem';
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
      return 'isoState';
    default:
      if (/^def/i.test(node.id)) return 'naiveDefect';
      if (/^qual/i.test(node.id)) return 'bfoQuality';
      return 'default';
  }
}

/**
 * Removes unsupported characters from IDs for Mermaid compatibility.
 */
function sanitizeId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}