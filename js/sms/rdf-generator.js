/**
 * SMS LAYER: RDF GENERATOR
 * ------------------------
 * Simulates how the Semantic Graph is persisted in a W3C RDF Triplestore.
 * Generates pure Turtle (.ttl) serialisation and ontology-specific temporal SPARQL queries.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';

/**
 * Generates a W3C RDF Turtle (.ttl) serialisation string from a Semantic Graph.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph with nodes and edges.
 * @returns {string} Pure Turtle (.ttl) serialisation text.
 */
export function generateRdfStorage(semanticGraph) {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes) || semanticGraph.nodes.length === 0) {
    return '# Empty RDF Graph (0 triples)';
  }

  const is4D = semanticGraph.nodes.some(n => n.type === 'State' || n.type === 'ActualIndividual');
  const isBFO = semanticGraph.nodes.some(n => n.type === 'MaterialEntity' || n.type === 'Quality');
  let ttl = '';

  // 1. 4D ISO 15926 Turtle Serialisation
  if (is4D) {
    ttl += `@prefix iso: <http://example.org/iso15926/> .\n`;
    ttl += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`;
    ttl += `# 4D Perdurant Graph persisted as Pure Binary RDF Triples\n`;

    const individuals = semanticGraph.nodes.filter(n => n.type === 'ActualIndividual');
    individuals.forEach(ind => {
      const cls = ind.properties?.entityClass || 'Part';
      ttl += `:${ind.id} a iso:ActualIndividual , iso:${cls} .\n`;
    });

    const defectNodes = semanticGraph.nodes.filter(n => n.type === 'Defect');
    defectNodes.forEach(d => {
      const dType = d.properties?.defectType || 'defect';
      const dVal = d.properties?.value || 'present';
      ttl += `:${d.id} a iso:DefectClass ;\n    iso:defectType "${dType}" ;\n    iso:severity "${dVal}" .\n`;
    });

    const states = semanticGraph.nodes.filter(n => n.type === 'State');
    states.forEach(st => {
      const outgoing = (semanticGraph.edges || []).filter(e => e.from === st.id);
      const vFrom = st.properties?.validFrom;
      const vTo = st.properties?.validTo;

      ttl += `\n:${st.id} a iso:State`;

      outgoing.forEach(e => {
        if (e.label === 'temporalPartOf') {
          ttl += ` ;\n    iso:temporalPartOf :${e.to}`;
        } else if (e.label === 'mounted_in') {
          ttl += ` ;\n    iso:mountedIn :${e.to}`;
        } else if (e.label === 'has_slot') {
          ttl += ` ;\n    iso:hasSlot :${e.to}`;
        } else if (e.label === 'stored_at') {
          ttl += ` ;\n    iso:storedAt :${e.to}`;
        } else if (e.label === 'has_defect') {
          ttl += ` ;\n    iso:hasDefect :${e.to}`;
        }
      });

      if (vFrom !== undefined && vFrom !== null) {
        ttl += ` ;\n    iso:validFrom "${vFrom}"^^xsd:integer`;
      }
      if (vTo !== undefined && vTo !== null) {
        ttl += ` ;\n    iso:validTo   "${vTo}"^^xsd:integer`;
      }

      ttl += ` .\n`;
    });

    return ttl;
  }

  // 2. 3D BFO Turtle Serialisation (with W3C Reification)
  if (isBFO) {
    ttl += `@prefix : <http://example.org/bfo/> .\n`;
    ttl += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`;
    ttl += `# 3D Continuant Graph persisted via W3C Reification & Quality Inherence\n`;

    semanticGraph.nodes.filter(n => n.type === 'MaterialEntity').forEach(n => {
      const cls = n.properties?.entityClass || 'Part';
      ttl += `:${n.id} a :MaterialEntity , :${cls} .\n`;
    });

    semanticGraph.nodes.filter(n => n.type === 'Quality').forEach(q => {
      const inh = (semanticGraph.edges || []).find(e => e.from === q.id && e.label === 'inheres_in');
      const vFrom = q.properties?.validFrom;
      const vTo = q.properties?.validTo;
      ttl += `\n:${q.id} a :Quality`;
      if (q.properties?.qualityType) {
        ttl += ` ;\n    :qualityType "${q.properties.qualityType}"`;
      }
      if (q.properties?.value) {
        ttl += ` ;\n    :value "${q.properties.value}"`;
      }
      if (inh) {
        ttl += ` ;\n    :inheres_in :${inh.to}`;
      }
      if (vFrom !== undefined && vFrom !== null) {
        ttl += ` ;\n    :validFrom "${vFrom}"^^xsd:integer`;
      }
      if (vTo !== undefined && vTo !== null) {
        ttl += ` ;\n    :validTo   "${vTo}"^^xsd:integer`;
      }
      ttl += ` .\n`;
    });

    (semanticGraph.edges || []).filter(e => e.type !== 'inherence').forEach(edge => {
      const vFrom = edge.properties?.validFrom;
      const vTo = edge.properties?.validTo;
      const rel = edge.label || edge.type;
      const isChildToParent = rel === 'mounted_in' || rel === 'stored_at';
      const parentId = isChildToParent ? edge.to : edge.from;
      const childId = isChildToParent ? edge.from : edge.to;

      ttl += `\n_:${edge.id} a :RelationalQuality ;\n`;
      ttl += `    :relationType :${rel} ;\n`;
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

    return ttl;
  }

  // 3. Naive Graph (Node / Edge) Turtle Serialisation with Reified Edge Properties
  ttl += `@prefix : <http://example.org/naive/> .\n`;
  ttl += `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n`;
  ttl += `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n`;
  ttl += `# Naive Domain Graph persisted as RDF Triples & Reified Statements\n`;

  semanticGraph.nodes.forEach(n => {
    ttl += `:${n.id} a :${n.type || 'Part'}`;
    if (n.properties) {
      Object.entries(n.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
          ttl += ` ;\n    :${k} "${v}"`;
        }
      });
    }
    ttl += ` .\n`;
  });

  (semanticGraph.edges || []).forEach(edge => {
    const edgeRel = edge.label || 'has_part';
    const vFrom = edge.properties?.validFrom;
    const vTo = edge.properties?.validTo;

    // Emit direct triple if currently active
    if (edge.properties?.isCurrent !== false) {
      ttl += `\n:${edge.from} :${edgeRel} :${edge.to} .\n`;
    }

    // Emit W3C Statement reification to hold validFrom/validTo and edge-attached defects
    ttl += `_:${edge.id} a rdf:Statement ;\n`;
    ttl += `    rdf:subject   :${edge.from} ;\n`;
    ttl += `    rdf:predicate :${edgeRel} ;\n`;
    ttl += `    rdf:object    :${edge.to}`;

    if (vFrom !== undefined && vFrom !== null) {
      ttl += ` ;\n    :validFrom "${vFrom}"^^xsd:integer`;
    }
    if (vTo !== undefined && vTo !== null) {
      ttl += ` ;\n    :validTo   "${vTo}"^^xsd:integer`;
    }
    if (edge.properties) {
      Object.entries(edge.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
          ttl += ` ;\n    :${k} "${v}"`;
        }
      });
    }
    ttl += ` .\n`;
  });

  return ttl;
}

/**
 * Generates an ontology-aware temporal SPARQL query for time T.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph.
 * @param {number} currentTime - Current discrete timestamp T.
 * @param {string} [ontology='NAIVE_NODE'] - Active ontology identifier.
 * @returns {string} SPARQL query string.
 */
export function generateRdfQuery(semanticGraph, currentTime = 0, ontology = 'NAIVE_NODE') {
  const t = currentTime ?? 0;
  const is4D = ontology === 'ISO15926' || semanticGraph?.nodes?.some(n => n.type === 'State');
  const isBFO = ontology === 'BFO' || semanticGraph?.nodes?.some(n => n.type === 'MaterialEntity');

  if (is4D) {
    return `# SPARQL (W3C RDF) — ISO 15926 (4D) State & Defect Audit at T = ${t}
PREFIX iso: <http://example.org/iso15926/>
SELECT ?part ?location ?defectType ?severity
WHERE {
  ?st iso:temporalPartOf ?part ;
      iso:mountedIn|iso:storedAt ?locState ;
      iso:validFrom ?vf .
  ?locState iso:temporalPartOf ?location .
  OPTIONAL { ?st iso:validTo ?vt }
  FILTER (?vf <= ${t} && (!BOUND(?vt) || ?vt > ${t}))

  OPTIONAL {
    ?defState iso:temporalPartOf ?part ;
              iso:hasDefect ?def .
    ?def iso:defectType ?defectType ;
         iso:severity ?severity .
  }
}`;
  }

  if (isBFO) {
    return `# SPARQL (W3C RDF) — BFO (3D) Reified Placement & Quality at T = ${t}
PREFIX : <http://example.org/bfo/>
SELECT ?part ?location ?qualityType ?value
WHERE {
  ?stmt a :RelationalQuality ;
        :hasChild ?part ;
        :hasParent ?location ;
        :validFrom ?vf .
  OPTIONAL { ?stmt :validTo ?vt }
  FILTER (?vf <= ${t} && (!BOUND(?vt) || ?vt > ${t}))

  OPTIONAL {
    ?qual a :Quality ;
          :inheres_in ?part ;
          :qualityType ?qualityType ;
          :value ?value ;
          :validFrom ?qvf .
    OPTIONAL { ?qual :validTo ?qvt }
    FILTER (?qvf <= ${t} && (!BOUND(?qvt) || ?qvt > ${t}))
  }
}`;
  }

  if (ontology === 'NAIVE_EDGE') {
    return `# SPARQL (W3C RDF) — Naive Graph (Edge) Reified Statement Query at T = ${t}
# WARNING: Reads :crack from active placement statement ?stmt!
PREFIX : <http://example.org/naive/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?part ?location ?crack
WHERE {
  ?stmt a rdf:Statement ;
        rdf:subject ?part ;
        rdf:predicate ?pred ;
        rdf:object ?location ;
        :validFrom ?vf .
  OPTIONAL { ?stmt :validTo ?vt }
  OPTIONAL { ?stmt :crack ?crack }
  FILTER (?pred IN (:mounted_in, :stored_at))
  FILTER (?vf <= ${t} && (!BOUND(?vt) || ?vt > ${t}))
}`;
  }

  return `# SPARQL (W3C RDF) — Naive Graph (Node) Query at T = ${t}
# WARNING: :crack is attached directly to ?part without temporal bounds!
PREFIX : <http://example.org/naive/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?part ?location ?crack
WHERE {
  ?stmt a rdf:Statement ;
        rdf:subject ?part ;
        rdf:object ?location ;
        :validFrom ?vf .
  OPTIONAL { ?stmt :validTo ?vt }
  OPTIONAL { ?part :crack ?crack }
  FILTER (?vf <= ${t} && (!BOUND(?vt) || ?vt > ${t}))
}`;
}