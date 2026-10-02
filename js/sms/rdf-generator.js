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

    const defectNodes = (semanticGraph.nodes || []).filter(n => n.type === 'Defect');
    defectNodes.forEach(d => {
      ttl += `:${d.id} a iso:DefectClass .\n`;
    });

    const states = (semanticGraph.nodes || []).filter(n => n.type === 'State');
    states.forEach(st => {
      const tpoEdges = (semanticGraph.edges || []).filter(
        e => e.from === st.id && (e.label === 'temporalPartOf' || e.type === 'classification') && !e.to.startsWith('def')
      );
      const partOfEdges = (semanticGraph.edges || []).filter(
        e => e.from === st.id && (e.label === 'mounted_in' || e.type === 'mounted_in' || e.label === 'partOf')
      );
      const hasPartEdges = (semanticGraph.edges || []).filter(
        e => e.from === st.id && (e.label === 'hasPart' || (e.type === 'composition' && e.label !== 'mounted_in' && e.type !== 'mounted_in'))
      );
      const hasSlotEdges = (semanticGraph.edges || []).filter(
        e => e.from === st.id && (e.label === 'has_slot' || e.type === 'has_slot')
      );
      const storedAtEdges = (semanticGraph.edges || []).filter(
        e => e.from === st.id && (e.label === 'stored_at' || e.type === 'stored_at')
      );
      const hasDefectEdges = (semanticGraph.edges || []).filter(
        e => e.from === st.id && (e.label === 'has_defect' || e.to.startsWith('def'))
      );

      const vFrom = st.properties?.validFrom;
      const vTo = st.properties?.validTo;

      ttl += `\n:${st.id} a iso:State`;

      tpoEdges.forEach(e => {
        ttl += ` ;\n    iso:temporalPartOf :${e.to}`;
      });

      partOfEdges.forEach(e => {
        ttl += ` ;\n    iso:partOf :${e.to}`;
      });

      hasPartEdges.forEach(e => {
        ttl += ` ;\n    iso:hasPart :${e.to}`;
      });

      hasSlotEdges.forEach(e => {
        ttl += ` ;\n    iso:hasSlot :${e.to}`;
      });

      storedAtEdges.forEach(e => {
        ttl += ` ;\n    iso:storedAt :${e.to}`;
      });

      hasDefectEdges.forEach(e => {
        ttl += ` ;\n    iso:hasDefect :${e.to}`;
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
    const domainClasses = ['Vehicle', 'Slot', 'Part', 'Defect', 'Warehouse'];
    const hasDomainNodes = (semanticGraph.nodes || []).some(n => domainClasses.includes(n.type));

    ttl += `@prefix : <http://example.org/> .\n`;
    ttl += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`;

    if (hasDomainNodes) {
      ttl += `# Naive Domain Graph persisted as Direct Triples & Properties\n`;

      // 1. Domain entities and inline properties
      (semanticGraph.nodes || []).forEach(n => {
        ttl += `:${n.id} a :${n.type || 'Part'}`;
        if (n.properties) {
          const customProps = Object.entries(n.properties).filter(
            ([k]) => !['isCurrent', 'originalId', 'entityType', 'validFrom', 'validTo', 'ownerId'].includes(k)
          );
          customProps.forEach(([k, v]) => {
            ttl += ` ;\n    :${k} "${v}"`;
          });
        }
        ttl += ` .\n`;
      });

      // 2. Direct relationships
      (semanticGraph.edges || []).forEach(edge => {
        const edgeRel = edge.label || 'has_part';
        ttl += `:${edge.from} :${edgeRel} :${edge.to} .\n`;
      });
    } else {
      ttl += `# 3D Continuant Graph persisted via W3C Reification & Quality Inherence\n`;

      // 1. Base continuant entities
      (semanticGraph.nodes || []).filter(n => n.type === 'MaterialEntity').forEach(n => {
        ttl += `:${n.id} a :MaterialEntity .\n`;
      });

      // 1b. Dependent Continuants (Quality)
      (semanticGraph.nodes || []).filter(n => n.type === 'Quality').forEach(q => {
        ttl += `:${q.id} a :Quality`;
        const inh = (semanticGraph.edges || []).find(e => e.from === q.id && e.label === 'inheres_in');
        if (inh) {
          ttl += ` ;\n    :inheres_in :${inh.to}`;
        }
        ttl += ` .\n`;
      });

      // 2. Synthesise reified statements autonomously for temporal relations
      (semanticGraph.edges || []).filter(e => e.type !== 'inherence').forEach(edge => {
        const vFrom = edge.properties?.validFrom;
        const vTo = edge.properties?.validTo;
        const rel = edge.label || edge.relationType || edge.type;

        // Respect semantic directionality of predicates:
        // - mounted_in: Part (from) is mounted in Slot/Vehicle (to) => parent is edge.to, child is edge.from
        // - has_slot / has_part / composition: parent is edge.from, child is edge.to
        const isMountedIn = rel === 'mounted_in';
        const parentId = isMountedIn ? edge.to : edge.from;
        const childId = isMountedIn ? edge.from : edge.to;

        ttl += `\n_:${edge.id} a :RelationalQuality ;\n`;
        ttl += `    :hasParent :${parentId} ;\n`;
        ttl += `    :hasChild  :${childId}`;

        if (vFrom !== undefined && vFrom !== null) {
          ttl += ` ;\n    :validFrom "${vFrom}"^^xsd:integer`;
        }
        if (vTo !== undefined && vTo !== null) {
          ttl += ` ;\n    :validTo   "${vTo}"^^xsd:integer`;
        }

        ttl += ` .\n`;
      });
    }
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
    return `# SPARQL (W3C RDF) - 4D Perdurant Full Graph Topology
PREFIX iso: <http://example.org/iso15926/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
}`;
  }

  const hasQuality = semanticGraph?.nodes?.some(n => n.type === 'Quality');
  if (hasQuality) {
    return `# SPARQL (W3C RDF) - 3D BFO Full Graph Topology & Inherence
PREFIX : <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
}`;
  }

  const domainClasses = ['Vehicle', 'Slot', 'Part', 'Defect', 'Warehouse'];
  const hasDomainNodes = (semanticGraph?.nodes || []).some(n => domainClasses.includes(n.type));

  if (hasDomainNodes) {
    return `# SPARQL (W3C RDF) - Domain Graph Full Topology & Properties
PREFIX : <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
}`;
  }

  return `# SPARQL (W3C RDF) - Full Graph Topology
PREFIX : <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
}`;
}
