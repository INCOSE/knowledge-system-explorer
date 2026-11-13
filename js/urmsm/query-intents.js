/**
 * URMSM LAYER: QUERY INTENTS & LIVE EVALUATION
 * --------------------------------------------
 * Evaluates live temporal query intents against the canonical Semantic Graph
 * by projecting to SMRM and checking active placements and defect associations.
 */

import { INTERNAL_PROPERTY_KEYS } from '../smrm/definitions.js';
import { reduceGraphForSMRM } from './smrm-view.js';

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

