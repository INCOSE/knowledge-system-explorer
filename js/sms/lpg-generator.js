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
  const is4D = semanticGraph?.nodes?.some(n => n.type === 'State');

  if (is4D) {
    return `// Cypher (Neo4j) - 4D Perdurant
MATCH (p_state:State)-[:hasPart]->(c_state:State)
WHERE p_state.validFrom <= ${currentTime} 
  AND (p_state.validTo IS NULL OR p_state.validTo > ${currentTime})
MATCH (p_state)-[:temporalPartOf]->(p_4d:ActualIndividual)
MATCH (c_state)-[:temporalPartOf]->(c_4d:ActualIndividual)
RETURN p_4d.id AS Parent4D, c_4d.id AS Child4D`;
  }

  return `// Cypher (Neo4j) - 3D Continuant
MATCH (p)-[r:has_part]->(c)
WHERE r.validFrom <= ${currentTime} 
  AND (r.validTo IS NULL OR r.validTo > ${currentTime})
RETURN p.id AS Parent, c.id AS Child`;
}
