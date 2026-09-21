/**
 * SMS LAYER: LPG GENERATOR
 * ------------------------
 * Simulates how the Semantic Graph is persisted in a Labeled Property Graph
 * database (like Neo4j). Generates storage table views and Cypher queries.
 */

export function generateLpgStorageHtml(semanticGraph, ontology) {
  let html = `<table><thead><tr>`;
  
  if (ontology === 'BFO') {
    html += `<th>Source</th><th>Target</th><th>valid_from</th><th>valid_to</th><th>Status</th></tr></thead><tbody>`;
    // In BFO LPG, edges carry the temporal validity properties
    semanticGraph.edges.forEach(e => {
      const vFrom = e.data?.event?.valid_from;
      const vTo = e.data?.event?.valid_to;
      const isActive = e.data?.isActive;
      const rowClass = isActive ? 'active-row' : 'closed-row';
      const toText = vTo !== null && vTo !== undefined ? `T${vTo}` : '—';
      
      html += `<tr class="${rowClass}"><td>${e.from}</td><td><strong>${e.to}</strong></td><td>T${vFrom}</td><td>${toText}</td><td>${isActive ? 'Active' : 'Closed'}</td></tr>`;
    });
  } else {
    // ISO 15926 LPG
    html += `<th>Parent Slice</th><th>Child Slice</th><th>LPG Rel Properties</th><th>4D Extent</th></tr></thead><tbody>`;
    semanticGraph.edges.filter(e => e.type === 'composition').forEach(e => {
      const vFrom = e.data?.event?.valid_from;
      const vTo = e.data?.event?.valid_to;
      const isActive = e.data?.isActive;
      const span = isActive ? `[T${vFrom}..now]` : `[T${vFrom}..T${vTo}]`;
      const rowClass = isActive ? 'active-row' : 'closed-row';
      
      html += `<tr class="${rowClass}"><td>${e.from}</td><td><strong>${e.to}</strong></td><td><code>{qty: 1, rev: '${e.id}', span: '${span}'}</code></td><td>(Mapped via temporalPartOf)</td></tr>`;
    });
  }
  
  html += '</tbody></table>';
  return html;
}

export function generateLpgQuery(ontology, currentTime) {
  if (ontology === 'BFO') {
    return `// Cypher (Neo4j) - BFO 3D
MATCH (p)-[r:has_part]->(c)
WHERE r.valid_from <= ${currentTime} 
  AND (r.valid_to IS NULL OR r.valid_to > ${currentTime})
RETURN p.id AS Parent, c.id AS Child`;
  } else {
    return `// Cypher (Neo4j) - ISO 15926 4D
MATCH (p_state:State)-[:COMPOSED_OF]->(c_state:State)
WHERE p_state.valid_from <= ${currentTime} 
  AND (p_state.valid_to IS NULL OR p_state.valid_to > ${currentTime})
MATCH (p_state)-[:temporalPartOf]->(p_4d:ActualIndividual)
MATCH (c_state)-[:temporalPartOf]->(c_4d:ActualIndividual)
RETURN p_4d.id AS Parent4D, c_4d.id AS Child4D`;
  }
}