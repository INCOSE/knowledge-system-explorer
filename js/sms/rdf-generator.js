/**
 * SMS LAYER: RDF GENERATOR
 * ------------------------
 * Simulates how the Semantic Graph is persisted in a W3C RDF Triplestore.
 * Generates Turtle (.ttl) serialisation and SPARQL queries.
 */

export function generateRdfStorageHtml(semanticGraph, ontology) {
  let ttl = '';
  
  if (ontology === 'BFO') {
    ttl += `# BFO 3D in SMS: RDF Turtle with W3C Reification\n`;
    const statements = semanticGraph.nodes.filter(n => n.type === 'TemporalPartMembership');
    
    statements.forEach(stmt => {
      const event = stmt.data.event;
      ttl += `\n_:${event.id} a :TemporalPartMembership ;\n`;
      ttl += `    :hasParent :${event.from} ;\n`;
      ttl += `    :hasChild  :${event.to} ;\n`;
      ttl += `    :validFrom "${event.valid_from}"^^xsd:integer `;
      if (event.valid_to !== null) {
        ttl += `;\n    :validTo   "${event.valid_to}"^^xsd:integer .\n`;
      } else {
        ttl += `.\n`;
      }
    });
  } else {
    ttl += `# ISO 15926-2 in SMS: Pure Binary RDF Triples (Tenseless Composition)\n`;
    const extents = semanticGraph.nodes.filter(n => n.type === 'ActualIndividual');
    
    extents.forEach(ex => {
      ttl += `:${ex.id} a iso:ActualIndividual .\n`;
    });

    semanticGraph.edges.filter(e => e.type === 'composition').forEach(e => {
      const event = e.data.event;
      const pState = `:${event.from}_state_${event.id}`;
      const cState = `:${event.to}_state_${event.id}`;
      
      ttl += `\n${pState} a iso:State ;\n    iso:temporalPartOf :${event.from}_4D ;\n    iso:hasPart ${cState} .\n`;
      ttl += `${cState} a iso:State ;\n    iso:temporalPartOf :${event.to}_4D .\n`;
    });
  }

  return `<pre class="code-block">${ttl}</pre>`;
}

export function generateRdfQuery(ontology, currentTime) {
  if (ontology === 'BFO') {
    return `# SPARQL - BFO 3D
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
  } else {
    return `# SPARQL - ISO 15926 4D
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
}