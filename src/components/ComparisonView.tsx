import { X, ExternalLink, Quote, Check, XCircle } from 'lucide-react';
import type { ExpertCandidate, SourceRecord } from '../types';

interface ComparisonViewProps {
  candidates: ExpertCandidate[];
  records: SourceRecord[];
  onClose: () => void;
}

export function ComparisonView({ candidates, records, onClose }: ComparisonViewProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-30 bg-navy-950/80 backdrop-blur-sm flex flex-col animate-fade-in">
      <div className="border-b border-navy-800/50 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h2 className="font-serif text-lg text-white">Candidate comparison</h2>
        <button onClick={onClose} className="btn-ghost px-2 py-1 text-xs">
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      <div className="overflow-auto scrollbar-thin flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-48 text-left text-xs text-navy-400 uppercase tracking-wider font-medium pb-3 align-bottom">
                  Attribute
                </th>
                {candidates.map((c) => (
                  <th key={c.id} className="text-left pb-3 align-bottom pl-4">
                    <div className="font-serif text-base text-white">{c.name}</div>
                    <div className="text-xs text-navy-500">{c.expertise.join(', ') || 'Not documented'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/40">
              <CompareRow label="Match score">
                {candidates.map((c) => (
                  <span key={c.id} className="font-mono text-lg font-semibold text-gold-400">
                    {c.matchScore}
                  </span>
                ))}
              </CompareRow>
              <CompareRow label="Evidence strength">
                {candidates.map((c) => (
                  <span key={c.id} className="text-sm text-navy-200 capitalize">{c.evidenceStrength}</span>
                ))}
              </CompareRow>
              <CompareRow label="Role identification">
                {candidates.map((c) => (
                  <span key={c.id} className="text-sm text-navy-200">
                    {c.role === 'expert' ? 'Identified as expert' : c.role === 'ambiguous' ? 'Role ambiguous' : 'Mentioned only'}
                  </span>
                ))}
              </CompareRow>
              <CompareRow label="Source records">
                {candidates.map((c) => (
                  <span key={c.id} className="text-sm text-navy-200">{c.recordCount}</span>
                ))}
              </CompareRow>
              <CompareRow label="Documented issues">
                {candidates.map((c) => (
                  <div key={c.id} className="flex flex-wrap gap-1">
                    {c.documentedIssues.length > 0 ? c.documentedIssues.map((i) => (
                      <span key={i} className="chip-inactive text-[10px]">{i}</span>
                    )) : <span className="text-sm text-navy-500 italic">None documented</span>}
                  </div>
                ))}
              </CompareRow>
              <CompareRow label="Match explanation">
                {candidates.map((c) => (
                  <p key={c.id} className="text-xs text-navy-300 leading-relaxed">{c.matchExplanation}</p>
                ))}
              </CompareRow>
              <CompareRow label="Supporting records">
                {candidates.map((c) => {
                  const recs = records.filter((r) => c.recordIds.includes(r.id));
                  return (
                    <div key={c.id} className="space-y-1.5">
                      {recs.slice(0, 3).map((r) => (
                        <div key={r.id} className="text-xs">
                          <div className="text-navy-200">{r.caseName}</div>
                          <div className="text-navy-500">{r.court} · {r.dateFiled || 'Date unknown'}</div>
                          {r.absoluteUrl && (
                            <a href={r.absoluteUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-gold-400 hover:text-gold-300 mt-0.5">
                              Source <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      ))}
                      {recs.length === 0 && <span className="text-xs text-navy-500 italic">No linked records</span>}
                    </div>
                  );
                })}
              </CompareRow>
              <CompareRow label="Missing information">
                {candidates.map((c) => (
                  <ul key={c.id} className="space-y-1">
                    {c.missingInfo.slice(0, 4).map((info, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-navy-400">
                        <XCircle className="w-3 h-3 text-navy-600 flex-shrink-0 mt-0.5" />
                        {info}
                      </li>
                    ))}
                  </ul>
                ))}
              </CompareRow>
              <CompareRow label="Source-linked">
                {candidates.map((c) => (
                  <span key={c.id}>
                    {c.recordIds.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent-400">
                        <Check className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-xs text-navy-500">No records</span>
                    )}
                  </span>
                ))}
              </CompareRow>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, children }: { label: string; children: React.ReactNode | React.ReactNode[] }) {
  return (
    <tr>
      <td className="py-3 text-xs text-navy-400 uppercase tracking-wider font-medium align-top w-48">
        {label}
      </td>
      {Array.isArray(children) ? (
        children.map((child, i) => (
          <td key={i} className="py-3 pl-4 align-top">{child}</td>
        ))
      ) : (
        <td className="py-3 pl-4 align-top">{children}</td>
      )}
    </tr>
  );
}
