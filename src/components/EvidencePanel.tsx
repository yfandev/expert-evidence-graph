import { ExternalLink, Calendar, Gavel, FileText, Quote, Info } from 'lucide-react';
import type { SourceRecord, ExpertCandidate } from '../types';

interface EvidencePanelProps {
  candidate: ExpertCandidate | null;
  records: SourceRecord[];
  onClose: () => void;
}

export function EvidencePanel({ candidate, records, onClose }: EvidencePanelProps) {
  if (!candidate) return null;
  const candidateRecords = records.filter((r) => candidate.recordIds.includes(r.id));

  return (
    <div className="card-elevated animate-slide-in-right h-full flex flex-col max-h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-navy-800/50 flex-shrink-0">
        <div className="min-w-0">
          <h2 className="font-serif text-lg text-white truncate">{candidate.name}</h2>
          <p className="text-xs text-navy-400">
            {candidate.expertise.join(', ') || 'Expertise not documented'}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost px-2 py-1 text-xs">
          Close
        </button>
      </div>

      <div className="overflow-y-auto scrollbar-thin flex-1 p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Match score" value={`${candidate.matchScore}`} highlight />
          <StatBox label="Records" value={`${candidate.recordCount}`} />
          <StatBox label="Evidence" value={candidate.evidenceStrength} />
        </div>

        <div>
          <h3 className="label">Why this candidate surfaced</h3>
          <p className="text-sm text-navy-100 leading-relaxed">{candidate.matchExplanation}</p>
        </div>

        <div>
          <h3 className="label">Documented technical issues</h3>
          {candidate.documentedIssues.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {candidate.documentedIssues.map((issue) => (
                <span key={issue} className="chip-active text-xs">{issue}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-navy-500 italic">No specific technical issues identified in source records.</p>
          )}
        </div>

        <div className="divider" />

        <div>
          <h3 className="label">Supporting source records ({candidateRecords.length})</h3>
          {candidateRecords.length === 0 ? (
            <p className="text-sm text-navy-500 italic">No linked source records.</p>
          ) : (
            <div className="space-y-3">
              {candidateRecords.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </div>

        <div className="divider" />

        <div>
          <h3 className="label">Not found in available records</h3>
          <ul className="space-y-1.5">
            {candidate.missingInfo.map((info, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-navy-400">
                <span className="w-1 h-1 rounded-full bg-navy-600 mt-2 flex-shrink-0" />
                {info}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-navy-950/40 border border-navy-800/50">
          <Info className="w-4 h-4 text-gold-400/70 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-navy-400 leading-relaxed">
            This candidate is a research lead, not a recommendation. Match score reflects relevance to your search criteria,
            not professional quality or credibility. All information must be independently verified before contacting.
          </p>
        </div>
      </div>
    </div>
  );
}

function RecordCard({ record }: { record: SourceRecord }) {
  return (
    <div className="card p-3.5 bg-navy-950/40">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-white truncate flex items-center gap-1.5">
            <Gavel className="w-3.5 h-3.5 text-navy-400 flex-shrink-0" />
            {record.caseName}
          </h4>
          <p className="text-xs text-navy-400 mt-0.5">{record.court}</p>
        </div>
        {record.isDemo && (
          <span className="chip text-[10px] bg-gold-400/10 text-gold-300 border-gold-400/20 flex-shrink-0">
            Demo data
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-navy-500 mb-2.5">
        {record.dateFiled && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(record.dateFiled)}
          </span>
        )}
        {record.docketNumber && (
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {record.docketNumber}
          </span>
        )}
        {record.status && (
          <span className="text-navy-400">{record.status}</span>
        )}
      </div>

      {record.snippet && (
        <div className="relative pl-3 border-l-2 border-gold-400/30 mb-2.5">
          <Quote className="w-3 h-3 text-gold-400/50 absolute -left-1.5 top-0" />
          <p className="text-xs text-navy-200 leading-relaxed line-clamp-4">
            {record.snippet}
          </p>
        </div>
      )}

      {record.absoluteUrl && (
        <a
          href={record.absoluteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 transition-colors"
        >
          View on CourtListener
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 text-center border ${
      highlight ? 'bg-gold-400/10 border-gold-400/20' : 'bg-navy-950/40 border-navy-800/50'
    }`}>
      <div className={`text-lg font-semibold font-mono ${highlight ? 'text-gold-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[10px] text-navy-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
