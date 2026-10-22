import { useState, useMemo, useCallback } from 'react';
import {
  Scale, ArrowLeft, Loader2, AlertTriangle, RefreshCw,
  Network, List, Sparkles, BookOpen, GitCompare,
  ChevronRight, Info, Database, Wifi,
} from 'lucide-react';
import type {
  CaseRequirements, Jurisdiction, SearchResult, SearchFilters,
  ExpertCandidate, GraphNode, DataMode,
} from './types';
import { extractRequirements } from './lib/extraction';
import { searchRecords, rerankResults } from './lib/search';
import { RERANK_MODIFIERS } from './lib/rerank';
import { Landing } from './components/Landing';
import { RequirementsPanel } from './components/RequirementsPanel';
import { CandidateCard } from './components/CandidateCard';
import { EvidencePanel } from './components/EvidencePanel';
import { ForceGraph } from './components/ForceGraph';
import { FilterBar } from './components/FilterBar';
import { ComparisonView } from './components/ComparisonView';

type View = 'landing' | 'results';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>('live');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [requirements, setRequirements] = useState<CaseRequirements | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    jurisdiction: 'all',
    minEvidenceStrength: 'weak',
    minRelevance: 0,
  });

  const handleSearch = useCallback(async (description: string, jurisdiction: Jurisdiction, mode: DataMode) => {
    setLoading(true);
    setError(null);
    setDataMode(mode);
    try {
      const reqs = { ...extractRequirements(description), jurisdiction };
      setRequirements(reqs);
      const searchResult = await searchRecords(reqs, mode);
      setResult(searchResult);
      setDataMode(searchResult.dataMode);
      setView('results');
      setSelectedCandidateId(null);
      setSelectedGraphNode(null);
      setCompareIds(new Set());
      setFilters({ keyword: '', jurisdiction: 'all', minEvidenceStrength: 'weak', minRelevance: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRequirementsChange = useCallback((reqs: CaseRequirements) => {
    setRequirements(reqs);
  }, []);

  const handleRerank = useCallback(async () => {
    if (!requirements || !result) return;
    setLoading(true);
    setError(null);
    try {
      const reranked = rerankResults(result, requirements, dataMode);
      setResult(reranked);
      setSelectedCandidateId(null);
      setSelectedGraphNode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reranking failed');
    } finally {
      setLoading(false);
    }
  }, [requirements, result, dataMode]);

  const handleLiveReSearch = useCallback(async () => {
    if (!requirements) return;
    setLoading(true);
    setError(null);
    try {
      const searchResult = await searchRecords(requirements, dataMode);
      setResult(searchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [requirements, dataMode]);

  const handleModifier = useCallback((modifierId: string) => {
    if (!requirements) return;
    const mod = RERANK_MODIFIERS.find((m) => m.id === modifierId);
    if (!mod) return;
    const newReqs = mod.apply(requirements);
    setRequirements(newReqs);
    if (result) {
      setLoading(true);
      setTimeout(async () => {
        try {
          const reranked = rerankResults(result, newReqs, dataMode);
          setResult(reranked);
        } finally {
          setLoading(false);
        }
      }, 100);
    }
  }, [requirements, result, dataMode]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredCandidates = useMemo(() => {
    if (!result) return [];
    const strengthOrder = { strong: 3, moderate: 2, weak: 1 };
    return result.candidates.filter((c) => {
      if (filters.keyword) {
        const text = (c.name + ' ' + c.expertise.join(' ') + ' ' + c.matchExplanation).toLowerCase();
        if (!text.includes(filters.keyword.toLowerCase())) return false;
      }
      if (filters.jurisdiction !== 'all') {
        const candidateRecords = result.records.filter((r) => c.recordIds.includes(r.id));
        const matchesJurisdiction = candidateRecords.some((r) => {
          if (filters.jurisdiction === 'federal') return r.jurisdiction.startsWith('ca') || /^[a-z]{2,3}$/.test(r.jurisdiction);
          if (filters.jurisdiction === 'california') return r.jurisdiction.includes('cal') || r.court.toLowerCase().includes('california');
          return true;
        });
        if (!matchesJurisdiction && candidateRecords.length > 0) return false;
      }
      if (strengthOrder[c.evidenceStrength] < strengthOrder[filters.minEvidenceStrength]) return false;
      if (c.matchScore < filters.minRelevance) return false;
      return true;
    });
  }, [result, filters]);

  const selectedCandidate = useMemo(() => {
    if (!result || !selectedCandidateId) return null;
    return result.candidates.find((c) => c.id === selectedCandidateId) || null;
  }, [result, selectedCandidateId]);

  const compareCandidates = useMemo(() => {
    if (!result) return [];
    return result.candidates.filter((c) => compareIds.has(c.id));
  }, [result, compareIds]);

  if (view === 'landing') {
    return (
      <>
        <Landing onSearch={handleSearch} loading={loading} />
        {error && (
          <div className="fixed bottom-6 right-6 max-w-sm card-elevated p-4 animate-slide-in-right z-50">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium mb-1">Search error</p>
                <p className="text-xs text-navy-300">{error}</p>
                <p className="text-xs text-navy-400 mt-2">
                  Try demo data mode, or check that the CourtListener API token is configured.
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (view === 'results' && result) {
    return (
      <div className="min-h-screen flex flex-col">
        <ResultsHeader
          dataMode={result.dataMode}
          onBack={() => setView('landing')}
          onShowMethodology={() => setShowMethodology(true)}
          compareCount={compareIds.size}
          onShowComparison={() => setShowComparison(true)}
        />

        {error && (
          <div className="max-w-7xl mx-auto w-full px-6 mt-3">
            <div className="card p-3 border-gold-400/30 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white">{error}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={handleLiveReSearch} className="btn-secondary text-xs px-3 py-1.5">
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                  <button
                    onClick={() => { setDataMode('demo'); handleSearch(result.requirements.rawDescription, result.requirements.jurisdiction, 'demo'); }}
                    className="text-xs text-gold-400 hover:text-gold-300"
                  >
                    Switch to demo data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {result.whatChanged && (
          <div className="max-w-7xl mx-auto w-full px-6 mt-3">
            <div className={`card p-3 flex items-start gap-2.5 animate-fade-in ${
              result.whatChanged.includes('failed')
                ? 'border-gold-400/30 bg-gold-400/5'
                : 'border-accent-400/20 bg-accent-400/5'
            }`}>
              {result.whatChanged.includes('failed') ? (
                <AlertTriangle className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 text-accent-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-xs font-medium mb-0.5 ${
                  result.whatChanged.includes('failed') ? 'text-gold-400' : 'text-accent-400'
                }`}>
                  {result.whatChanged.includes('failed') ? 'Live search unavailable' : 'What changed?'}
                </p>
                <p className="text-sm text-navy-200">{result.whatChanged}</p>
                {result.whatChanged.includes('failed') && (
                  <button onClick={handleLiveReSearch} className="mt-2 inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300">
                    <RefreshCw className="w-3 h-3" />
                    Retry live search
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex-1">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-4 space-y-4">
              {requirements && (
                <RequirementsPanel
                  requirements={requirements}
                  onChange={handleRequirementsChange}
                  onRerank={handleRerank}
                  loading={loading}
                />
              )}

              <RerankModifiers onApply={handleModifier} />

              <div className="card p-4">
                <FilterBar
                  filters={filters}
                  onChange={setFilters}
                  resultCount={filteredCandidates.length}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-white flex items-center gap-2">
                    <List className="w-4 h-4 text-gold-400" />
                    Candidate shortlist
                  </h2>
                  <span className="text-xs text-navy-400">{filteredCandidates.length} of {result.candidates.length}</span>
                </div>
                {filteredCandidates.length === 0 ? (
                  <EmptyState
                    title={result.candidates.length === 0 ? 'No named experts found' : 'No candidates match filters'}
                    message={result.candidates.length === 0
                      ? 'The available opinion text does not identify a person as an expert. Try a more specific search or inspect the source records.'
                      : 'Try adjusting filters or search requirements.'}
                  />
                ) : (
                  filteredCandidates.map((candidate, idx) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      records={result.records}
                      rank={idx + 1}
                      selected={selectedCandidateId === candidate.id}
                      compareSelected={compareIds.has(candidate.id)}
                      onSelect={() => {
                        setSelectedCandidateId(candidate.id);
                        setSelectedGraphNode(null);
                      }}
                      onToggleCompare={() => toggleCompare(candidate.id)}
                      onInspect={() => setSelectedCandidateId(candidate.id)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-4">
              <GraphPanel
                result={result}
                selectedGraphNode={selectedGraphNode}
                onSelectNode={(node) => {
                  setSelectedGraphNode(node);
                  if (node.candidateId) setSelectedCandidateId(node.candidateId);
                  else setSelectedCandidateId(null);
                }}
                onClearSelection={() => setSelectedGraphNode(null)}
              />

              {selectedCandidate ? (
                <div className="lg:hidden">
                  <EvidencePanel
                    candidate={selectedCandidate}
                    records={result.records}
                    onClose={() => {
                      setSelectedCandidateId(null);
                      setSelectedGraphNode(null);
                    }}
                  />
                </div>
              ) : selectedGraphNode ? (
                <div className="lg:hidden card p-3 bg-navy-950/40">
                  <GraphNodeDetail node={selectedGraphNode} result={result} />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {(selectedCandidate || selectedGraphNode) && (
          <div className="hidden lg:block fixed right-0 top-16 bottom-0 w-96 z-20 p-4">
            {selectedCandidate ? (
              <EvidencePanel
                candidate={selectedCandidate}
                records={result.records}
                onClose={() => {
                  setSelectedCandidateId(null);
                  setSelectedGraphNode(null);
                }}
              />
            ) : selectedGraphNode ? (
              <GraphNodeSidebar
                node={selectedGraphNode}
                result={result}
                onClose={() => setSelectedGraphNode(null)}
              />
            ) : null}
          </div>
        )}

        {showComparison && compareCandidates.length > 0 && (
          <ComparisonView
            candidates={compareCandidates}
            records={result.records}
            onClose={() => setShowComparison(false)}
          />
        )}

        {showMethodology && (
          <MethodologyNote onClose={() => setShowMethodology(false)} />
        )}
      </div>
    );
  }

  return null;
}

function ResultsHeader({
  dataMode, onBack, onShowMethodology, compareCount, onShowComparison,
}: {
  dataMode: DataMode;
  onBack: () => void;
  onShowMethodology: () => void;
  compareCount: number;
  onShowComparison: () => void;
}) {
  return (
    <header className="border-b border-navy-800/50 backdrop-blur-md bg-navy-950/80 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-ghost px-2 py-1">
            <ArrowLeft className="w-4 h-4" />
            New search
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gold-400/10 border border-gold-400/30 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-gold-400" />
            </div>
            <span className="font-serif text-base text-white">Expert Evidence Graph</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`chip text-xs ${dataMode === 'demo' ? 'chip-active' : 'chip-inactive'}`}>
            {dataMode === 'demo' ? <Database className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {dataMode === 'demo' ? 'Demo data' : 'Live data'}
          </span>
          <button onClick={onShowMethodology} className="btn-ghost text-xs px-2 py-1">
            <BookOpen className="w-3.5 h-3.5" />
            Methodology
          </button>
          {compareCount > 0 && (
            <button onClick={onShowComparison} className="btn-primary text-xs px-3 py-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              Compare ({compareCount})
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function RerankModifiers({ onApply }: { onApply: (id: string) => void }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-medium text-white mb-1">Quick refinements</h3>
      <p className="text-xs text-navy-400 mb-3">Apply a change and see the ranking update</p>
      <div className="flex flex-wrap gap-2">
        {RERANK_MODIFIERS.map((mod) => (
          <button
            key={mod.id}
            onClick={() => onApply(mod.id)}
            className="chip-inactive text-xs hover:chip-active"
            title={mod.description}
          >
            {mod.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GraphPanel({
  result, selectedGraphNode, onSelectNode, onClearSelection,
}: {
  result: SearchResult;
  selectedGraphNode: GraphNode | null;
  onSelectNode: (node: GraphNode) => void;
  onClearSelection: () => void;
}) {
  const [showLegend, setShowLegend] = useState(true);
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-white flex items-center gap-2">
          <Network className="w-4 h-4 text-gold-400" />
          Evidence graph
          <span className="text-xs text-navy-400 font-normal">
            {result.graphNodes.length} nodes · {result.graphLinks.length} connections
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {selectedGraphNode && (
            <button onClick={onClearSelection} className="text-xs text-navy-400 hover:text-white">
              Clear selection
            </button>
          )}
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="text-xs text-navy-400 hover:text-white flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            Legend
          </button>
        </div>
      </div>

      <div className="relative rounded-lg bg-navy-950/40 border border-navy-800/30 overflow-hidden">
        <ForceGraph
          nodes={result.graphNodes}
          links={result.graphLinks}
          selectedNodeId={selectedGraphNode?.id || null}
          onSelectNode={onSelectNode}
          width={720}
          height={400}
        />
        {result.graphNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-navy-500">No graph data available</p>
          </div>
        )}
      </div>

      {result.candidates.length === 0 && (
        <p className="mt-2 text-xs text-navy-400">
          No people were identified in the available opinion text. The graph shows cases and issues only.
        </p>
      )}

      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <LegendItem color="#b8956a" label="People (potential experts)" />
          <LegendItem color="#47689a" label="Cases" />
          <LegendItem color="#4ab487" label="Technical issues" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-px bg-navy-300" />
            <span className="text-navy-400">Direct evidence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#46464d" strokeDasharray="3,2" strokeWidth="1" /></svg>
            <span className="text-navy-400">Inferred</span>
          </div>
        </div>
      )}

      {selectedGraphNode && (
        <div className="mt-3 card p-3 bg-navy-950/40 animate-fade-in lg:hidden">
          <GraphNodeDetail node={selectedGraphNode} result={result} />
        </div>
      )}
    </div>
  );
}

function GraphNodeDetail({ node, result }: { node: GraphNode; result: SearchResult }) {
  if (node.type === 'person') {
    const candidate = result.candidates.find((c) => c.id === node.candidateId);
    if (!candidate) return null;
    return (
      <div>
        <p className="text-sm font-medium text-white">{candidate.name}</p>
        <p className="text-xs text-navy-400 mt-0.5">{candidate.matchExplanation}</p>
      </div>
    );
  }
  if (node.type === 'case') {
    const record = result.records.find((r) => r.id === node.recordId);
    if (!record) return null;
    return (
      <div>
        <p className="text-sm font-medium text-white">{record.caseName}</p>
        <p className="text-xs text-navy-400 mt-0.5">{record.court}</p>
        {record.snippet && <p className="text-xs text-navy-300 mt-1 line-clamp-2">{record.snippet}</p>}
        {record.absoluteUrl && (
          <a href={record.absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gold-400 hover:text-gold-300 mt-1 inline-block">
            View on CourtListener
          </a>
        )}
      </div>
    );
  }
  if (node.type === 'issue') {
    const issue = result.issues.find((i) => i.id === node.issueId);
    if (!issue) return null;
    const linkedCandidates = result.candidates.filter((c) => issue.candidateIds.includes(c.id));
    return (
      <div>
        <p className="text-sm font-medium text-white">{issue.label}</p>
        <p className="text-xs text-navy-400 mt-0.5">{issue.recordIds.length} records · {linkedCandidates.length} candidates</p>
      </div>
    );
  }
  return null;
}

function GraphNodeSidebar({
  node,
  result,
  onClose,
}: {
  node: GraphNode;
  result: SearchResult;
  onClose: () => void;
}) {
  return (
    <div className="card-elevated h-full max-h-full overflow-y-auto animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-navy-800/50">
        <h2 className="text-sm font-medium text-white capitalize">{node.type} details</h2>
        <button onClick={onClose} className="btn-ghost px-2 py-1 text-xs">Close</button>
      </div>
      <div className="p-4">
        <GraphNodeDetail node={node} result={result} />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-navy-400">{label}</span>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="card p-6 text-center">
      <p className="text-sm text-white">{title}</p>
      <p className="text-xs text-navy-400 mt-1">{message}</p>
    </div>
  );
}

function MethodologyNote({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      <div className="card-elevated max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold-400" />
            Methodology
          </h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-xs">Close</button>
        </div>
        <div className="space-y-4 text-sm text-navy-200 leading-relaxed">
          <MethodSection title="Data source">
            This application searches public court records via the{' '}
            <a href="https://www.courtlistener.com/help/api/" target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:text-gold-300">CourtListener REST API</a>.
            Results include published court opinions with case names, courts, filing dates, and text snippets.
            All source links point to actual CourtListener record pages.
          </MethodSection>
          <MethodSection title="Expert identification">
            Candidate names are extracted from opinion text snippets using pattern matching for proper names
            near expert-indicator phrases ("expert witness," "expert testimony," "retained as an expert").
            Each candidate is classified as: <strong>expert</strong> (explicitly identified in source),
            <strong> ambiguous</strong> (professional title present, role unconfirmed), or
            <strong> mentioned</strong> (named in a relevant record, role not established).
            The application does not assume every name in a court record belongs to an expert witness.
          </MethodSection>
          <MethodSection title="Ranking">
            Match scores combine four factors: subject-matter relevance (0-40), case relevance (0-30),
            evidence specificity (0-40), and record count (0-20). Scores are deterministic and reproducible.
            The score reflects <strong>relevance to your search criteria</strong>, not professional quality,
            credibility, or likelihood of success. Higher scores mean stronger documented relevance.
          </MethodSection>
          <MethodSection title="Evidence graph">
            The graph connects people, cases, and technical issues only where source evidence supports a link.
            Direct links (solid lines) connect candidates identified as experts to their cases and issues.
            Inferred links (dashed lines) connect candidates whose role is not confirmed.
            The graph does not invent relationships to appear more connected.
          </MethodSection>
          <MethodSection title="Responsible data use">
            All factual claims cite their public source. Source facts are separated from system interpretations.
            Ambiguous identifications are labeled. The app does not claim candidates are "qualified" or "suitable."
            Missing information is shown explicitly rather than guessed. No confidential data is required.
            API credentials are kept server-side and never exposed in browser code.
          </MethodSection>
          <MethodSection title="Demo mode">
            When live API access is unavailable, a clearly labeled demo dataset of curated public records
            demonstrates the full workflow. Demo records are marked with a badge. Synthetic data is never
            mixed with live results without clear labeling.
          </MethodSection>
        </div>
      </div>
    </div>
  );
}

function MethodSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-gold-400 mb-1.5">{title}</h3>
      <p>{children}</p>
    </div>
  );
}
