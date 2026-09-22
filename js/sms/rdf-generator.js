/**
 * SMS LAYER: RDF GENERATOR
 * ------------------------
 * Simulates how the Semantic Graph is persisted in a W3C RDF Triplestore.
 * Generates pure Turtle (.ttl) serialisation and SPARQL queries.
 * Pure storage generator decoupled from ontologies and presentation markup.
 */

/**
 * Generates a W3C RDF Turtle (.ttl) serialisation string from a Semantic Graph.
 * If the graph contains 3D continuant entities, performs autonomous W3C Reification
 * for temporal binary relations. If the graph contains 4D perdurants, serialises
 * standard binary triples for temporal parts and states.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph with nodes and edges.
 * @returns {string} Pure Turtle (.ttl) serialisation text.
 */
export function generateRdfStorage(semanticGraph) {
  if (!semanticGraph) {
    return '';
  }

  const is4D = semanticGraph.nodes?.some(n => n.type === 'State');
  let ttl = '';

  if (is4D) {
    ttl += `@prefix iso: <http://example.org/iso15926/> .\n`;
    ttl += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`;
    ttl += `# 4D Perdurant Graph persisted as Pure Binary RDF Triples\n`;

    const individuals = (semanticGraph.nodes || []).filter(n => n.type === 'ActualIndividual');
    individuals.forEach(ind => {
      ttl += `:${ind.id} a iso:ActualIndividual .\n`;
    });

    const states = (semanticGraph.nodes || []).filter(n => n.type === 'State');
    states.forEach(st => {
      const tpoEdges = (semanticGraph.edges || []).filter(
        e => e.from === st.id && (e.label === 'temporalPartOf' || e.type === 'classification')
      );
      const hasPartEdges = (semanticGraph.edges || []).filter(
        e => e.from === st.id && (e.label === 'hasPart' || e.type === 'composition')
      );

      const vFrom = st.properties?.validFrom;
      const vTo = st.properties?.validTo;

      ttl += `\n:${st.id} a iso:State`;

      tpoEdges.forEach(e => {
        ttl += ` ;\n    iso:temporalPartOf :${e.to}`;
      });

      hasPartEdges.forEach(e => {
        ttl += ` ;\n    iso:hasPart :${e.to}`;
      });

      if (vFrom !== undefined && vFrom !== null) {
        ttl += ` ;\n    iso:validFrom "${vFrom}"^^xsd:integer`;
      }
      if (vTo !== undefined && vTo !== null) {
        ttl += ` ;\n    iso:validTo   "${vTo}"^^xsd:integer`;
      }

      ttl += ` .\n`;
    });
  } else {
    ttl += `@prefix : <http://example.org/> .\n`;
    ttl += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`;
    ttl += `# 3D Continuant Graph persisted via W3C Reification\n`;

    // 1. Base continuant entities
    (semanticGraph.nodes || []).forEach(n => {
      ttl += `:${n.id} a :${n.type || 'MaterialEntity'} .\n`;
    });

    // 2. Synthesise reified statements autonomously for temporal relations
    (semanticGraph.edges || []).forEach(edge => {
      const vFrom = edge.properties?.validFrom;
      const vTo = edge.properties?.validTo;

      ttl += `\n_:${edge.id} a :TemporalPartMembership ;\n`;
      ttl += `    :hasParent :${edge.from} ;\n`;
      ttl += `    :hasChild  :${edge.to}`;

      if (vFrom !== undefined && vFrom !== null) {
        ttl += ` ;\n    :validFrom "${vFrom}"^^xsd:integer`;
      }
      if (vTo !== undefined && vTo !== null) {
        ttl += ` ;\n    :validTo   "${vTo}"^^xsd:integer`;
      }

      ttl += ` .\n`;
    });
  }

  return ttl;
}

/**
 * Generates a SPARQL query for the specified Semantic Graph at the given point in time.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph with nodes and edges.
 * @param {number} currentTime - Current discrete time step.
 * @returns {string} SPARQL query string.
 */
export function generateRdfQuery(semanticGraph, currentTime) {
  const is4D = semanticGraph?.nodes?.some(n => n.type === 'State');

  if (is4D) {
    return `# SPARQL - 4D Perdurant Storage
PREFIX iso: <http://example.org/iso15926/>
SELECT ?parent4D ?child4D
WHERE {
  ?pState a iso:State ;
          iso:temporalPartOf ?parent4D ;
          iso:hasPart ?cState ;
          iso:validFrom ?from .
  ?cState a iso:State ;
          iso:temporalPartOf ?child4D .
  OPTIONAL { ?pState iso:validTo ?to }
  
  FILTER (?from <= ${currentTime} && 
         (!bound(?to) || ?to > ${currentTime}))
}`;
  }

  return `# SPARQL - 3D Reified Storage
PREFIX : <http://example.org/>
SELECT ?parent ?child
WHERE {
  ?stmt a :TemporalPartMembership ;
        :hasParent ?parent ;
        :hasChild ?child ;
        :validFrom ?from .
  OPTIONAL { ?stmt :validTo ?to }
  
  FILTER (?from <= ${currentTime} && 
         (!bound(?to) || ?to > ${currentTime}))
}`;
}
