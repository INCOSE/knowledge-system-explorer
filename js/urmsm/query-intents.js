/**
 * URMSM LAYER: QUERY INTENTS, DYNAMIC DEPTH & BENCHMARK METRICS
 * -------------------------------------------------------------
 * Evaluates live engineering queries over the canonical Semantic Graph,
 * dynamically scales Cypher/SPARQL query strings based on actual hierarchy depth,
 * and computes developer/engine complexity metrics.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';
import { reduceGraphForSMRM } from './smrm-view.js';

/**
 * Calculates the real engineering assembly depth of the current Semantic Graph.
 */
export function calculateGraphDepth(semanticGraph) {
  if (!semanticGraph || !Array.isArray(semanticGraph.edges) || semanticGraph.edges.length === 0) {
    return 1;
  }

  const reduced = reduceGraphForSMRM(semanticGraph);
  const parentToChildren = new Map();

  (reduced.edges || []).forEach(e => {
    if (e.properties?.isCurrent === false) return;
    if (e.label === 'has_part' || e.label === 'mounted_in') {
      const parent = e.label === 'has_part' ? e.from : e.to;
      const child = e.label === 'has_part' ? e.to : e.from;
      if (!parentToChildren.has(parent)) parentToChildren.set(parent, []);
      parentToChildren.get(parent).push(child);
    }
  });

  let maxDepth = 1;
  function dfs(nodeId, visited) {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    const children = parentToChildren.get(nodeId) || [];
    if (children.length === 0) return 0;
    let best = 0;
    for (const c of children) {
      best = Math.max(best, 1 + dfs(c, new Set(visited)));
    }
    return best;
  }

  for (const p of parentToChildren.keys()) {
    maxDepth = Math.max(maxDepth, dfs(p, new Set()));
  }

  return Math.max(1, maxDepth);
}

/**
 * Computes live query complexity badges (Depth, Joins/Hops, Temporal Guards).
 */
export function calculateQueryMetrics(semanticGraph, ontology = 'BFO', storage = 'LPG', queryIntent = 'DEEP_BOM') {
  const depth = calculateGraphDepth(semanticGraph);
  const is4D = ontology === 'ISO15926';
  const isRdf = storage === 'RDF';

  if (queryIntent === 'DEEP_BOM') {
    if (is4D) {
      return {
        depth,
        joins: isRdf ? 3 : 2,
        guards: 1,
        complexityClass: 'metric-badge-low'
      };
    }
    if (isRdf) {
      // BFO + RDF requires 4 reification triples per hop + slot hop
      return {
        depth,
        joins: depth * 5,
        guards: depth * 2,
        complexityClass: depth >= 2 ? 'metric-badge-high' : 'metric-badge-med'
      };
    }
    // BFO / Naive + LPG
    return {
      depth,
      joins: depth * 2,
      guards: depth,
      complexityClass: depth >= 3 ? 'metric-badge-med' : 'metric-badge-low'
    };
  }

  if (queryIntent === 'CONTAGION') {
    if (is4D) {
      return {
        depth,
        joins: 4,
        guards: 0,
        complexityClass: 'metric-badge-low'
      };
    }
    return {
      depth,
      joins: isRdf ? depth * 6 + 4 : depth * 2 + 2,
      guards: depth + 1,
      complexityClass: 'metric-badge-high'
    };
  }

  // CLONE_AUDIT
  return {
    depth,
    joins: isRdf ? 4 : 2,
    guards: is4D ? 1 : 2,
    complexityClass: ontology.startsWith('NAIVE') ? 'metric-badge-high' : 'metric-badge-low'
  };
}

/**
 * Generates dynamic, depth-aware Cypher or SPARQL query code for the active Query Intent.
 */
export function generateIntentQueryCode(semanticGraph, currentTime = 0, ontology = 'BFO', storage = 'LPG', queryIntent = 'DEEP_BOM') {
  const t = currentTime ?? 0;
  const depth = calculateGraphDepth(semanticGraph);
  const is4D = ontology === 'ISO15926' || semanticGraph?.nodes?.some(n => n.type === 'State');
  const isBFO = ontology === 'BFO' || semanticGraph?.nodes?.some(n => n.type === 'MaterialEntity');

  // ============================================================================
  // INTENT 2: HISTORICAL CONTAGION TRACE (Cross-Contamination Across Hierarchy)
  // ============================================================================
  if (queryIntent === 'CONTAGION') {
    if (storage === 'LPG') {
      if (is4D) {
        return `// Cypher (Neo4j) — ISO 15926 (4D) Contagion Trace (Zero Interval Math!)
MATCH (chip:ActualIndividual {originalId: 'Sensor_Chip_404'})<-[:temporalPartOf]-(chipSt:State)-[:has_defect]->(def:Defect)
MATCH (chipSt)-[:mounted_in|has_slot*1..8]->(vehSt:State)-[:temporalPartOf]->(veh:ActualIndividual {entityClass: 'Vehicle'})
RETURN chip.originalId AS part, veh.originalId AS contaminatedSystem,
       def.label AS defect, 'T' + vehSt.validFrom + ' → T' + coalesce(vehSt.validTo, 'now') AS exposureWindow`;
      }
      return `// Cypher (Neo4j) — 3D BFO Historical Contagion Trace (4-Interval Overlap Math!)
MATCH (q:Quality)-[inh:inheres_in]->(chip:MaterialEntity {id: 'Sensor_Chip_404'})
MATCH (chip)-[r1:mounted_in]->(inv:MaterialEntity)-[r2:mounted_in]->(pack:MaterialEntity)-[r3:mounted_in]->(veh:MaterialEntity)
WITH chip, q, veh,
     apoc.coll.max([inh.validFrom, r1.validFrom, r2.validFrom, r3.validFrom]) AS expStart,
     apoc.coll.min([ coalesce(inh.validTo, 999), coalesce(r1.validTo, 999), coalesce(r2.validTo, 999), coalesce(r3.validTo, 999) ]) AS expEnd
WHERE expStart < expEnd
RETURN chip.id AS part, veh.id AS contaminatedSystem, q.label AS defect, 'T' + expStart + ' → T' + expEnd AS exposureWindow`;
    }

    // RDF (SPARQL) — CONTAGION
    if (is4D) {
      return `# SPARQL — ISO 15926 (4D) Historical Contagion Walk Across State Slices
PREFIX iso: <http://example.org/iso15926/>
SELECT ?part ?contaminatedSystem ?defect ?vFrom ?vTo WHERE {
  ?chipSt iso:temporalPartOf :4d_Sensor_Chip_404 ;
          iso:hasDefect ?def ;
          (iso:mountedIn|iso:hasSlot)+ ?vehSt .
  ?vehSt  iso:temporalPartOf ?veh4D ;
          iso:validFrom ?vFrom .
  OPTIONAL { ?vehSt iso:validTo ?vTo }
}`;
    }

    return `# SPARQL — 3D BFO + W3C RDF Contagion Trace (Reified Interval Intersection!)
PREFIX bfo: <http://purl.obolibrary.org/obo/BFO_>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?chip ?veh ?defLabel ?overlapStart ?overlapEnd WHERE {
  ?stDef rdf:subject ?qual ; rdf:predicate bfo:inheres_in ; rdf:object :Sensor_Chip_404 ; bfo:validFrom ?dF ; bfo:validTo ?dT .
  ?st1   rdf:subject :Sensor_Chip_404 ; rdf:predicate bfo:mounted_in ; rdf:object ?inv ;  bfo:validFrom ?f1 ; bfo:validTo ?t1 .
  ?st2   rdf:subject ?inv ;             rdf:predicate bfo:mounted_in ; rdf:object ?pack ; bfo:validFrom ?f2 ; bfo:validTo ?t2 .
  ?st3   rdf:subject ?pack ;            rdf:predicate bfo:mounted_in ; rdf:object ?veh ;  bfo:validFrom ?f3 ; bfo:validTo ?t3 .
  BIND(IF(?dF > ?f3, ?dF, ?f3) AS ?overlapStart)
  BIND(IF(?dT < ?t3, ?dT, ?t3) AS ?overlapEnd)
  FILTER(?overlapStart < ?overlapEnd)
}`;
  }

  // ============================================================================
  // INTENT 3: PHYSICAL INTEGRITY & BILOCATION / CLONE AUDIT
  // ============================================================================
  if (queryIntent === 'CLONE_AUDIT') {
    if (storage === 'LPG') {
      return `// Cypher (Neo4j) — Defensive Physical Integrity Audit at T = ${t}
// Detects parts simultaneously active in multiple disjoint locations/parents
MATCH (part)-[r:mounted_in|stored_at]->(loc)
WHERE r.validFrom <= ${t} AND (r.validTo IS NULL OR r.validTo > ${t})
WITH part, collect(loc.id) AS activeLocations, count(DISTINCT loc) AS locCount
WHERE locCount > 1
RETURN part.id AS clonedPart, activeLocations AS bilocationTargets, 'CRITICAL: BILOCATION PARADOX' AS status`;
    }

    return `# SPARQL / SHACL — Formal Disjoint Spatial Site Integrity Audit at T = ${t}
PREFIX bfo: <http://purl.obolibrary.org/obo/BFO_>
SELECT ?part (COUNT(DISTINCT ?site) AS ?activeSites) WHERE {
  ?stmt rdf:subject ?part ;
        rdf:predicate ?rel ;
        rdf:object ?site ;
        bfo:validFrom ?vf .
  FILTER(?rel IN (bfo:mounted_in, bfo:stored_at))
  OPTIONAL { ?stmt bfo:validTo ?vt }
  FILTER(?vf <= ${t} && (!BOUND(?vt) || ?vt > ${t}))
}
GROUP BY ?part
HAVING (COUNT(DISTINCT ?site) > 1)`;
  }

  // ============================================================================
  // INTENT 1 (DEFAULT): DEEP TEMPORAL BOM AT TIME T (Dynamically scales with depth!)
  // ============================================================================
  if (storage === 'LPG') {
    if (is4D) {
      return `// Cypher (Neo4j) — ISO 15926 (4D) Deep BOM at T = ${t} (Depth-Invariant!)
MATCH (child:ActualIndividual)<-[:temporalPartOf]-(st:State)-[:mounted_in|has_slot|stored_at*1..]->(rootSt:State)-[:temporalPartOf]->(root:ActualIndividual)
WHERE st.validFrom <= ${t} AND (st.validTo IS NULL OR st.validTo > ${t})
OPTIONAL MATCH (st)-[hd:has_defect]->(def:Defect)
WHERE hd.validFrom <= ${t} AND (hd.validTo IS NULL OR hd.validTo > ${t})
RETURN child.originalId AS part, root.originalId AS location, def.label AS defect`;
    }

    if (depth <= 1) {
      if (isBFO) {
        return `// Cypher (Neo4j) — BFO (3D) Single-Level BOM at T = ${t} (Depth = 1)
MATCH (part:MaterialEntity)-[r1:mounted_in|stored_at]->(target:MaterialEntity)
WHERE r1.validFrom <= ${t} AND (r1.validTo IS NULL OR r1.validTo > ${t})
OPTIONAL MATCH (q:Quality)-[inh:inheres_in]->(part)
WHERE inh.validFrom <= ${t} AND (inh.validTo IS NULL OR inh.validTo > ${t})
RETURN part.id AS part, target.id AS location, q.label AS defect`;
      }
      return `// Cypher (Neo4j) — Naive Graph Active Structure at T = ${t} (Depth = 1)
MATCH (part:Part)-[r1:mounted_in|stored_at]->(target)
WHERE r1.validFrom <= ${t} AND (r1.validTo IS NULL OR r1.validTo > ${t})
RETURN part.id AS part, target.id AS location, part.crack AS defect`;
    }

    // Multi-level explicit hop unrolling for Depth >= 2
    let matchChain = `(n0)`;
    let whereClauses = [];
    for (let i = 1; i <= depth; i++) {
      matchChain += `-[r${i}:mounted_in|has_slot]->(n${i})`;
      whereClauses.push(`r${i}.validFrom <= ${t} AND (r${i}.validTo IS NULL OR r${i}.validTo > ${t})`);
    }

    return `// Cypher (Neo4j) — ${isBFO ? 'BFO (3D)' : 'Naive'} Multi-Level BOM at T = ${t} (Unrolled Depth = ${depth})
// Notice how every nested assembly level forces a new hop r1..r${depth} and temporal guard!
MATCH ${matchChain}
WHERE ${whereClauses.join('\n  AND ')}
OPTIONAL MATCH (q:Quality)-[inh:inheres_in]->(n0)
WHERE inh.validFrom <= ${t} AND (inh.validTo IS NULL OR inh.validTo > ${t})
RETURN n0.id AS part, n${depth}.id AS location, q.label AS defect`;
  }

  // STORAGE === 'RDF' (SPARQL)
  if (is4D) {
    return `# SPARQL — ISO 15926 (4D) Deep Transitive BOM at T = ${t} (3-Line Transitive Path!)
PREFIX iso: <http://example.org/iso15926/>
SELECT ?part ?rootSystem ?defect WHERE {
  ?childState iso:temporalPartOf ?part ;
              (iso:mountedIn|iso:hasSlot|iso:storedAt)+ ?rootState ;
              iso:validFrom ?vf .
  ?rootState  iso:temporalPartOf ?rootSystem .
  OPTIONAL { ?childState iso:validTo ?vt }
  FILTER(?vf <= ${t} && (!BOUND(?vt) || ?vt > ${t}))
}`;
  }

  // 3D BFO + W3C RDF: Reification Explosion across Depth Levels!
  if (depth <= 1) {
    return `# SPARQL (W3C RDF) — BFO (3D) Single-Level Reified Query at T = ${t}
PREFIX bfo: <http://purl.obolibrary.org/obo/BFO_>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?part ?target ?defectLabel WHERE {
  ?stmt1 a rdf:Statement ;
         rdf:subject ?part ;
         rdf:predicate bfo:mounted_in ;
         rdf:object ?target ;
         bfo:validFrom ?vf1 .
  OPTIONAL { ?stmt1 bfo:validTo ?vt1 }
  FILTER(?vf1 <= ${t} && (!BOUND(?vt1) || ?vt1 > ${t}))
}`;
  }

  let sparqlBlocks = [];
  for (let i = 1; i <= depth; i++) {
    const subj = i === 1 ? '?leafPart' : `?parent_${i - 1}`;
    const obj = i === depth ? '?topSystem' : `?parent_${i}`;
    sparqlBlocks.push(`  # --- Depth Level ${i}: Reified Statement Hop ${i} ---
  ?stmt_${i} a rdf:Statement ;
          rdf:subject ${subj} ;
          rdf:predicate bfo:mounted_in ;
          rdf:object ${obj} ;
          bfo:validFrom ?vf_${i} .
  OPTIONAL { ?stmt_${i} bfo:validTo ?vt_${i} }
  FILTER(?vf_${i} <= ${t} && (!BOUND(?vt_${i}) || ?vt_${i} > ${t}))`);
  }

  return `# SPARQL (W3C RDF) — BFO (3D) Reification Wall at T = ${t} (Depth = ${depth} Levels)
# Property paths (mounted_in*) CANNOT inspect timestamps on intermediate rdf:Statement nodes!
PREFIX bfo: <http://purl.obolibrary.org/obo/BFO_>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?leafPart ?topSystem ?defectLabel WHERE {
${sparqlBlocks.join('\n\n')}
}`;
}

/**
 * Evaluates the live query against the state/graph to populate the result table.
 */
export function evaluateLiveQuery(semanticGraph, currentTime = 0, ontology = 'NAIVE_NODE', queryIntent = 'DEEP_BOM', eventLog = []) {
  if (!semanticGraph || !Array.isArray(semanticGraph.nodes)) {
    return { rows: [], defectiveCount: 0, columns: ['part', 'location', 'defect'] };
  }

  // ==========================================================================
  // INTENT 2: HISTORICAL CONTAGION TRACE
  // ==========================================================================
  if (queryIntent === 'CONTAGION') {
    const rows = [];
    const events = (eventLog || []).filter(e => e.valid_from <= currentTime);

    // Build mounting intervals: { childId, parentId, from, to }
    const mountIntervals = [];
    const openMounts = new Map();

    events.forEach(ev => {
      if (ev.type === 'ASSEMBLE') {
        openMounts.set(ev.childId, {
          childId: ev.childId,
          parentId: ev.parentId,
          relType: ev.relationType || 'mounted_in',
          from: ev.valid_from,
          to: currentTime
        });
      } else if (ev.type === 'DISMANTLE') {
        const active = openMounts.get(ev.childId);
        if (active) {
          active.to = ev.valid_from;
          mountIntervals.push({ ...active });
          openMounts.delete(ev.childId);
        }
      }
    });
    for (const active of openMounts.values()) {
      mountIntervals.push({ ...active });
    }

    // Find defect intervals
    const defectIntervals = [];
    const openDefects = new Map();
    events.forEach(ev => {
      if (ev.type === 'REPORT_DEFECT') {
        openDefects.set(`${ev.targetId}::${ev.defectName}`, {
          targetId: ev.targetId,
          defectLabel: `${ev.defectName}: ${ev.defectValue}`,
          from: ev.valid_from,
          to: currentTime
        });
      } else if (ev.type === 'REVOKE_DEFECT') {
        const key = `${ev.targetId}::${ev.defectName}`;
        const active = openDefects.get(key);
        if (active) {
          active.to = ev.valid_from;
          defectIntervals.push({ ...active });
          openDefects.delete(key);
        }
      }
    });
    for (const active of openDefects.values()) {
      defectIntervals.push({ ...active });
    }

    // Recursively find root system exposure intervals
    function traceAncestors(currId, startT, endT, visited = new Set()) {
      if (visited.has(currId)) return [];
      visited.add(currId);

      const results = [];
      const parentLinks = mountIntervals.filter(
        m => m.childId === currId && m.relType === 'mounted_in' && Math.max(m.from, startT) < Math.min(m.to, endT)
      );

      for (const link of parentLinks) {
        const overlapStart = Math.max(link.from, startT);
        const overlapEnd = Math.min(link.to, endT);
        const higher = traceAncestors(link.parentId, overlapStart, overlapEnd, new Set(visited));
        if (higher.length > 0) {
          results.push(...higher);
        } else {
          results.push({ system: link.parentId, from: overlapStart, to: overlapEnd });
        }
      }
      return results;
    }

    defectIntervals.forEach(def => {
      const exposures = traceAncestors(def.targetId, def.from, def.to);
      exposures.forEach(exp => {
        rows.push({
          part: `${def.targetId} (${def.defectLabel})`,
          location: `${exp.system} [T${exp.from} → T${exp.to}]`,
          defect: `CONTAMINATED (${exp.to - exp.from}s exposure)`,
          hasDefect: true
        });
      });
    });

    return {
      rows,
      defectiveCount: rows.length
    };
  }

  // ==========================================================================
  // INTENT 3: PHYSICAL INTEGRITY & BILOCATION / CLONE AUDIT
  // ==========================================================================
  if (queryIntent === 'CLONE_AUDIT') {
    const reduced = reduceGraphForSMRM(semanticGraph);
    const activeLocationsByPart = new Map();

    (reduced.edges || []).forEach(e => {
      if (e.properties?.isCurrent === false) return;
      let partId = null;
      let locId = null;
      if (e.label === 'has_part') {
        partId = e.to;
        locId = e.from;
      } else if (e.label === 'mounted_in' || e.label === 'stored_at') {
        partId = e.from;
        locId = e.to;
      }
      if (partId && locId) {
        if (!activeLocationsByPart.has(partId)) activeLocationsByPart.set(partId, []);
        if (!activeLocationsByPart.get(partId).includes(locId)) {
          activeLocationsByPart.get(partId).push(locId);
        }
      }
    });

    const rows = [];
    let clonesFound = 0;
    for (const [partId, locs] of activeLocationsByPart.entries()) {
      const isCloned = locs.length > 1;
      if (isCloned) clonesFound++;
      rows.push({
        part: partId,
        location: locs.join(' ⚡ & '),
        defect: isCloned ? `⚠️ BILOCATION PARADOX (${locs.length} sites)` : '✅ Valid (1 site)',
        hasDefect: isCloned
      });
    }

    return {
      rows,
      defectiveCount: clonesFound
    };
  }

  // ==========================================================================
  // INTENT 1 (DEFAULT): DEEP TEMPORAL BOM AT TIME T
  // ==========================================================================
  const reduced = reduceGraphForSMRM(semanticGraph);
  const rows = [];
  let defectiveCount = 0;

  const activePlacementEdges = (reduced.edges || []).filter(
    e => (e.label === 'has_part' || e.label === 'mounted_in' || e.label === 'stored_at') &&
         e.properties?.isCurrent !== false
  );

  // Map immediate parent -> root ancestor so deep BOM shows full path
  const immediateParentMap = new Map();
  activePlacementEdges.forEach(edge => {
    const isParentToChild = edge.label === 'has_part';
    const partId = isParentToChild ? edge.to : edge.from;
    const locId = isParentToChild ? edge.from : edge.to;
    immediateParentMap.set(partId, locId);
  });

  function buildLocationChain(partId) {
    const chain = [];
    let curr = immediateParentMap.get(partId);
    const seen = new Set([partId]);
    while (curr && !seen.has(curr)) {
      chain.push(curr);
      seen.add(curr);
      curr = immediateParentMap.get(curr);
    }
    return chain.join(' ➔ ');
  }

  activePlacementEdges.forEach(edge => {
    const isParentToChild = edge.label === 'has_part';
    const partId = isParentToChild ? edge.to : edge.from;
    const locationId = buildLocationChain(partId) || (isParentToChild ? edge.from : edge.to);
    const partNode = reduced.nodes.find(n => n.id === partId);

    const defects = [];

    if (edge.properties) {
      Object.entries(edge.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
          defects.push(`${k}: ${v}`);
        }
      });
    }

    if (partNode && partNode.properties) {
      Object.entries(partNode.properties).forEach(([k, v]) => {
        if (!INTERNAL_PROPERTY_KEYS.includes(k) && v !== undefined && v !== null) {
          defects.push(`${k}: ${v}`);
        }
      });
    }

    (reduced.edges || []).forEach(defEdge => {
      if (
        defEdge.from === partId &&
        (defEdge.label === 'has_defect' || defEdge.type === 'has_defect') &&
        defEdge.properties?.isCurrent !== false
      ) {
        const defNode = reduced.nodes.find(n => n.id === defEdge.to);
        if (defNode) {
          const dType = defNode.properties?.defectType || defNode.properties?.qualityType;
          const dVal = defNode.properties?.value;
          const text = dType && dVal ? `${dType}: ${dVal}` : (defNode.label || defNode.id);
          if (!defects.includes(text)) defects.push(text);
        }
      }
    });

    const hasDefect = defects.length > 0;
    if (hasDefect) defectiveCount++;

    rows.push({
      part: partId,
      location: locationId,
      defect: hasDefect ? defects.join(', ') : 'null',
      hasDefect
    });
  });

  return {
    rows,
    defectiveCount
  };
}