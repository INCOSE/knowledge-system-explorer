/**
 * SMS LAYER: LPG GENERATOR
 * ------------------------
 * Simulates how the Semantic Graph is persisted in a Labeled Property Graph
 * database (such as Neo4j).
 * Pure storage generator decoupled from ontologies and presentation markup.
 */

/**
 * Generates an array of LPG edge storage records from a Semantic Graph.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph with nodes and edges.
 * @returns {Array<Object>} Clean array of relationship records for LPG storage table.
 */
export function generateLpgStorage(semanticGraph) {
  if (!semanticGraph || !Array.isArray(semanticGraph.edges)) {
    return [];
  }

  return semanticGraph.edges.map(edge => {
    const props = edge.properties ? { ...edge.properties } : {};
    const isActive = props.isCurrent !== undefined
      ? Boolean(props.isCurrent)
      : (props.validTo === null || props.validTo === undefined);

    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.label || edge.type || 'RELATED_TO',
      properties: props,
      isActive
    };
  });
}

/**
 * Generates a Cypher query for the specified Semantic Graph at the given point in time.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph with nodes and edges.
 * @param {number} currentTime - Current discrete time step.
 * @returns {string} Cypher query string.
 */
export function generateLpgQuery(semanticGraph, currentTime) {
  if (!semanticGraph) return '';

  const nodes = semanticGraph.nodes || [];

  const is4D = nodes.some(n => n.type === 'State');
  if (is4D) {
    return `// Cypher (Neo4j) - 4D Perdurant Full Graph Topology
MATCH (n)-[r]->(m)
RETURN n, r, m`;
  }

  // Check for BFO Quality (Dependent Continuant)
  const hasQuality = nodes.some(n => n.type === 'Quality');
  if (hasQuality) {
    return `// Cypher (Neo4j) - 3D BFO Full Graph Topology & Inherence
MATCH (n)-[r]->(m)
RETURN n, r, m`;
  }

  // Check if we are in domain / naive mode
  const domainClasses = ['Vehicle', 'Slot', 'Part', 'Defect', 'Warehouse'];
  const hasDomainNodes = nodes.some(n => domainClasses.includes(n.type));

  if (hasDomainNodes) {
    return `// Cypher (Neo4j) - Domain Graph Full Topology & Properties
MATCH (n)-[r]->(m)
RETURN n, r, m`;
  }

  return `// Cypher (Neo4j) - Full Structural Topology & Edge Properties
MATCH (n)-[r]->(m)
RETURN n, r, m`;
}
