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
  def += '  classDef iso4d fill:#4f46e5,stroke:#3730a3,color:#ffffff,stroke-width:2px\n';
  def += '  classDef isoState fill:#0d9488,stroke:#0f766e,color:#ffffff,stroke-width:1px\n\n';

  // 2. Add Nodes
  semanticGraph.nodes.forEach(node => {
    const safeId = sanitizeId(node.id);
    const styleClass = getNodeClass(node);
    const safeLabel = node.label.replace(/\n/g, '<br/>'); // Support multi-line

    def += `  ${safeId}["<b>${safeLabel}</b><br/><i>${node.type}</i>"]:::${styleClass}\n`;
  });

  def += '\n';

  // 3. Add Edges
  semanticGraph.edges.forEach(edge => {
    const safeFrom = sanitizeId(edge.from);
    const safeTo = sanitizeId(edge.to);
    const isCurrent = edge.properties?.isCurrent !== false;

    // Solid line for active composition, dashed line for closed or structural classification links
    const linkStyle = (!isCurrent || edge.type === 'classification') ? '-.->' : '-->';

    // Escape quotes in the label
    const safeEdgeLabel = (edge.label || '').replace(/"/g, "'");

    def += `  ${safeFrom} ${linkStyle}|"${safeEdgeLabel}"| ${safeTo}\n`;
  });

  return def;
}

/**
 * Maps ontological node types to Mermaid CSS classes.
 */
function getNodeClass(node) {
  switch (node.type) {
    case 'MaterialEntity':
      return node.properties?.entityType === 'system' ? 'bfoSys' : 'bfoElem';
    case 'ActualIndividual':
      return 'iso4d';
    case 'State':
      return 'isoState';
    default:
      return 'default';
  }
}

/**
 * Removes unsupported characters from IDs for Mermaid compatibility.
 */
function sanitizeId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}