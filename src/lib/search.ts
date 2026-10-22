import type { CaseRequirements, SearchResult, DataMode } from '../types';
import { buildSearchQuery, getCourtFilter } from './extraction';
import { processResults, type RawApiResult } from './ranking';
import { demoResults } from './demoData';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/courtlistener-search`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface LiveSearchResponse {
  count: number;
  results: RawApiResult[];
  authenticated: boolean;
  error?: string;
}

export async function searchRecords(
  reqs: CaseRequirements,
  dataMode: DataMode,
): Promise<SearchResult> {
  const query = buildSearchQuery(reqs);
  const court = getCourtFilter(reqs.jurisdiction);

  if (dataMode === 'demo') {
    return processResults(demoResults, reqs, query, 'demo', true);
  }

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ query, type: 'o', court }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(
        `CourtListener search failed (${response.status}): ${errorBody.error || 'Unknown error'}`,
      );
    }

    const data: LiveSearchResponse = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    if (!data.results || data.results.length === 0) {
      const demoResult = processResults(demoResults, reqs, query, 'demo', true);
      return {
        ...demoResult,
        dataMode: 'demo',
        whatChanged: 'Live CourtListener search returned no matching records. Showing demo data so you can explore the full workflow. Try refining your search terms or retry live search.',
      };
    }

    return processResults(data.results, reqs, query, 'live', false);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    const demoResult = processResults(demoResults, reqs, query, 'demo', true);
    return {
      ...demoResult,
      dataMode: 'demo',
      whatChanged: `Live CourtListener search failed (${errorMsg}). Showing demo data instead. You can retry live search or continue exploring the demo dataset.`,
    };
  }
}

export function rerankResults(
  prevResult: SearchResult,
  newReqs: CaseRequirements,
  dataMode: DataMode,
): SearchResult {
  const query = buildSearchQuery(newReqs);

  if (dataMode === 'demo') {
    const reranked = processResults(demoResults, newReqs, query, 'demo', true);
    return {
      ...reranked,
      whatChanged: generateWhatChanged(prevResult, reranked, newReqs),
    };
  }

  return {
    ...prevResult,
    requirements: newReqs,
    query,
    whatChanged: 'Requirements updated. Click "Search records" to fetch new results from CourtListener.',
  };
}

function generateWhatChanged(
  prev: SearchResult,
  next: SearchResult,
  newReqs: CaseRequirements,
): string {
  const changes: string[] = [];

  const prevIds = new Set(prev.candidates.map((c) => c.id));
  const nextIds = new Set(next.candidates.map((c) => c.id));
  const newCandidates = next.candidates.filter((c) => !prevIds.has(c.id));
  const droppedCandidates = prev.candidates.filter((c) => !nextIds.has(c.id));

  if (newReqs.evidencePreference === 'testimony' && prev.requirements.evidencePreference !== 'testimony') {
    changes.push('Prioritized records with explicit expert testimony evidence.');
  }
  if (newReqs.jurisdiction !== prev.requirements.jurisdiction) {
    changes.push(`Jurisdiction filter changed to ${newReqs.jurisdiction}.`);
  }

  const prevTop = prev.candidates[0]?.id;
  const nextTop = next.candidates[0]?.id;
  if (prevTop && nextTop && prevTop !== nextTop) {
    const moved = next.candidates.find((c) => c.id === prevTop);
    changes.push(`Top candidate changed. Previous leader is now rank ${moved ? next.candidates.indexOf(moved) + 1 : 'N/A'}.`);
  }

  const scoreChanges = next.candidates
    .filter((c) => prev.candidates.some((p) => p.id === c.id))
    .map((c) => {
      const prevC = prev.candidates.find((p) => p.id === c.id)!;
      return { name: c.name, delta: c.matchScore - prevC.matchScore };
    })
    .filter((s) => s.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  for (const s of scoreChanges) {
    changes.push(`${s.name}: ${s.delta > 0 ? '+' : ''}${s.delta} points.`);
  }

  if (newCandidates.length > 0) {
    changes.push(`${newCandidates.length} new candidate(s) surfaced.`);
  }
  if (droppedCandidates.length > 0) {
    changes.push(`${droppedCandidates.length} candidate(s) no longer meet the threshold.`);
  }

  if (changes.length === 0) {
    changes.push('Requirements updated. Scores recalculated based on new criteria.');
  }

  return changes.join(' ');
}
