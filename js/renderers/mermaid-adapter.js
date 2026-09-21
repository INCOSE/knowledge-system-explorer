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
 */
function buildMermaidDefinition(semanticGraph) {
  // 1. Initialise the graph direction and styling classes
  let def = 'flowchart TD\n';
  def += '  classDef default fill:#f8fafc,stroke:#cbd5e1,color:#334155,stroke-width:1px\n';
  def += '  classDef bfoSys fill:#0284c7,stroke:#0369a1,color:#ffffff,stroke-width:2px\n';
  def += '  classDef bfoElem fill:#64748b,stroke:#475569,color:#ffffff,stroke-width:1px\n';
  def += '  classDef rdfStmt fill:#f59e0b,stroke:#d97706,color:#000000,stroke-width:1px\n';
  def += '  classDef rdfLit fill:#f1f5f9,stroke:#cbd5e1,color:#334155,stroke-dasharray:3 3\n';
  def += '  classDef iso4d fill:#4f46e5,stroke:#3730a3,color:#ffffff,stroke-width:2px\n';
  def += '  classDef isoState fill:#0d9488,stroke:#0f766e,color:#ffffff,stroke-width:1px\n\n';

  // 2. Add Nodes
  semanticGraph.nodes.forEach(node => {
    const safeId = sanitizeId(node.id);
    const styleClass = getNodeClass(node);
    const safeLabel = node.label.replace(/\n/g, '<br/>'); // Support multi-line
    
    let shapeOpen = '["';
    let shapeClose = '"]';
    
    // Assign specific shapes based on type
    if (node.type === 'TemporalPartMembership') {
      shapeOpen = '{{ "'; // Hexagon for RDF Statements
      shapeClose = '" }}';
    } else if (node.type === 'Literal') {
      shapeOpen = '(["';  // Pill shape for Literals
      shapeClose = '"])';
    }

    def += `  ${safeId}${shapeOpen}<b>${safeLabel}</b><br/><i>${node.type}</i>${shapeClose}:::${styleClass}\n`;
  });

  def += '\n';

  // 3. Add Edges
  semanticGraph.edges.forEach(edge => {
    const safeFrom = sanitizeId(edge.from);
    const safeTo = sanitizeId(edge.to);
    const isActive = edge.data?.isActive !== false;
    
    let linkStyle = '-->'; // Solid line
    
    if (!isActive || edge.data?.isPast || edge.type === 'classification') {
      linkStyle = '-.->'; // Dashed line for inactive, historical, or classification links
    } else if (edge.type === 'transition') {
      linkStyle = '==>';  // Thick line for LPG state transitions
    }

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
    case 'MaterialEntity': return node.data?.entityType === 'system' ? 'bfoSys' : 'bfoElem';
    case 'TemporalPartMembership': return 'rdfStmt';
    case 'Literal': return 'rdfLit';
    case 'ActualIndividual': return 'iso4d';
    case 'State': return 'isoState';
    default: return 'default';
  }
}

/**
 * Removes unsupported characters from IDs for Mermaid compatibility.
 */
function sanitizeId(id) {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}