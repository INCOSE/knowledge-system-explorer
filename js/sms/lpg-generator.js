/**
 * SMS LAYER: LPG GENERATOR & LIVE QUERY ENGINE
 * --------------------------------------------
 * Simulates how the Semantic Graph is persisted in a Labeled Property Graph
 * database (Neo4j) and executes live temporal queries at time T.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';
import { generatePhysicalGraph } from './sms-graph-generator.js';
import { reduceGraphForSMRM } from '../urmsm/smrm-view.js';

/**
 * Generates an array of LPG node records (Node Store) from a Semantic Graph.
 * Crucial for showing node-level properties (such as crack: '2mm' in NAIVE_NODE mode).
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph.
 * @returns {Array<{ id: string, label: string, type: string, properties: Object, isActive: boolean }>}
 */
export function generateLpgNodeStorage(semanticGraph) {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes)) {
    return [];
  }

  const physGraph = generatePhysicalGraph(semanticGraph, 'LPG');

  return physGraph.nodes.map(node => {
    const rawProps = node.properties ? { ...node.properties } : {};
    const displayProps = {};

    Object.entries(rawProps).forEach(([k, v]) => {
      if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
        displayProps[k] = v;
      }
    });

    if (node.type === 'Quality' || node.type === 'Defect') {
      const dKey = rawProps.qualityType || rawProps.defectType || 'defect';
      if (rawProps.value !== undefined) displayProps[dKey] = rawProps.value;
    }

    if (rawProps.validFrom !== undefined && rawProps.validFrom !== null) {
      displayProps.validFrom = rawProps.validFrom;
    }
    if (rawProps.validTo !== undefined && rawProps.validTo !== null) {
      displayProps.validTo = rawProps.validTo;
    }

    const isActive = rawProps.isCurrent !== undefined
      ? Boolean(rawProps.isCurrent)
      : (rawProps.validTo === null || rawProps.validTo === undefined);

    return {
      id: node.id,
      label: node.label || node.id,
      type: node.type || rawProps.entityClass || 'Node',
      properties: displayProps,
      isActive
    };
  });
}

/**
 * Generates an array of LPG edge storage records (Relationship Store) from a Semantic Graph.
 * Uses the physical LPG graph so that 4D TRANSITION_TO chains are included.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph.
 * @returns {Array<Object>} Relationship records for LPG storage table.
 */
export function generateLpgStorage(semanticGraph) {
  if (!semanticGraph || !Array.isArray(semanticGraph.edges)) {
    return [];
  }

  const physGraph = generatePhysicalGraph(semanticGraph, 'LPG');

  return physGraph.edges.map(edge => {
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
 * Generates an ontology-aware temporal Cypher query for time T.
 *
 * @param {Object} semanticGraph - Standardised Semantic Graph.
 * @param {number} currentTime - Current discrete timestamp T.
 * @param {string} [ontology='NAIVE_NODE'] - Active ontology identifier.
 * @returns {string} Cypher query string.
 */
export function generateLpgQuery(semanticGraph, currentTime = 0, ontology = 'NAIVE_NODE') {
  const t = currentTime ?? 0;
  const is4D = ontology === 'ISO15926' || semanticGraph?.nodes?.some(n => n.type === 'State');
  const isBFO = ontology === 'BFO' || semanticGraph?.nodes?.some(n => n.type === 'MaterialEntity');

  if (is4D) {
    return `// Cypher (Neo4j) — ISO 15926 (4D) State & Defect Audit at T = ${t}
MATCH (item:ActualIndividual)<-[:temporalPartOf]-(st:State)-[rel:mounted_in|stored_at]->(locState:State)-[:temporalPartOf]->(loc:ActualIndividual)
WHERE st.validFrom <= ${t} AND (st.validTo IS NULL OR st.validTo > ${t})
OPTIONAL MATCH (item)<-[:temporalPartOf]-(anyState:State)-[hd:has_defect]->(def:Defect)
WHERE hd.validFrom <= ${t} AND (hd.validTo IS NULL OR hd.validTo > ${t})
RETURN item.originalId AS part, loc.originalId AS location, def.label AS defect`;
  }

  if (isBFO) {
    return `// Cypher (Neo4j) — BFO (3D) Continuant & Quality Inherence at T = ${t}
MATCH (part:MaterialEntity)-[rel:mounted_in|stored_at]->(target:MaterialEntity)
WHERE rel.validFrom <= ${t} AND (rel.validTo IS NULL OR rel.validTo > ${t})
OPTIONAL MATCH (q:Quality)-[inh:inheres_in]->(part)
WHERE inh.validFrom <= ${t} AND (inh.validTo IS NULL OR inh.validTo > ${t})
RETURN part.id AS part, target.id AS location, q.label AS defect`;
  }

  if (ontology === 'NAIVE_EDGE') {
    return `// Cypher (Neo4j) — Naive Graph (Edge) Active Structure at T = ${t}
// WARNING: Reads defect property from active relationship r!
MATCH (part:Part)-[r:mounted_in|stored_at]->(target)
WHERE r.validFrom <= ${t} AND (r.validTo IS NULL OR r.validTo > ${t})
RETURN part.id AS part, target.id AS location, r.crack AS defect`;
  }

  return `// Cypher (Neo4j) — Naive Graph (Node) Active Structure at T = ${t}
// WARNING: Node properties have no temporal history (overwritten in-place)!
MATCH (part:Part)-[r:mounted_in|stored_at]->(target)
WHERE r.validFrom <= ${t} AND (r.validTo IS NULL OR r.validTo > ${t})
RETURN part.id AS part, target.id AS location, part.crack AS defect`;
}

/**
 * Executes the active temporal query against the current Semantic Graph in memory.
 * Demonstrates why NAIVE_EDGE loses the defect upon moving to the warehouse,
 * while BFO and ISO 15926 preserve it.
 *
 * @param {Object} semanticGraph - Current SMIM Semantic Graph.
 * @param {number} currentTime - Current system time T.
 * @param {string} [ontology='NAIVE_NODE'] - Active ontology mode.
 * @returns {{ rows: Array<{ part: string, location: string, defect: string, hasDefect: boolean }>, defectiveCount: number }}
 */
export function evaluateLiveQuery(semanticGraph, currentTime = 0, ontology = 'NAIVE_NODE') {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes) || semanticGraph.nodes.length === 0) {
    return { rows: [], defectiveCount: 0 };
  }

  const smrm = reduceGraphForSMRM(semanticGraph);
  const activeEdges = smrm.edges.filter(e => e.properties?.isCurrent !== false);
  const rows = [];

  // Map active defects in SMRM projection
  const defectMap = new Map();
  const addDefect = (id, text) => {
    if (!defectMap.has(id)) defectMap.set(id, []);
    defectMap.get(id).push(text);
  };

  smrm.nodes.forEach(n => {
    if (n.type === 'Defect') return;
    if (n.properties) {
      Object.entries(n.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
          addDefect(n.id, `${k}: ${v}`);
        }
      });
    }
  });

  activeEdges.forEach(e => {
    if (e.label === 'has_defect' || e.type === 'has_defect') {
      const defNode = smrm.nodes.find(n => n.id === e.to);
      if (defNode) {
        const dType = defNode.properties?.defectType || defNode.properties?.qualityType || 'defect';
        const dVal = defNode.properties?.value || 'present';
        addDefect(e.from, `${dType}: ${dVal}`);
      }
      return;
    }

    const childId = e.childId || (e.label === 'stored_at' || e.label === 'mounted_in' ? e.from : e.to);
    if (e.properties && childId) {
      Object.entries(e.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
          addDefect(childId, `${k}: ${v}`);
        }
      });
    }
  });

  // Collect active placements (has_part / stored_at)
  activeEdges.forEach(e => {
    if (e.label === 'has_defect' || e.type === 'has_defect') return;

    let partId = null;
    let locationId = null;

    if (e.label === 'has_part') {
      locationId = e.from;
      partId = e.to;
    } else if (e.label === 'stored_at' || e.label === 'mounted_in') {
      partId = e.from;
      locationId = e.to;
    }

    if (partId && locationId) {
      const defs = defectMap.get(partId) || [];
      const hasDefect = defs.length > 0;
      rows.push({
        part: partId,
        location: locationId,
        defect: hasDefect ? defs.join(', ') : 'NULL (0 defects)',
        hasDefect
      });
    }
  });

  const defectiveCount = rows.filter(r => r.hasDefect).length;
  return { rows, defectiveCount };
}