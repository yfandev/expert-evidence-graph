import { Award, FileText, AlertCircle, ChevronRight, UserCheck, HelpCircle, Eye } from 'lucide-react';
import type { ExpertCandidate, SourceRecord } from '../types';

interface CandidateCardProps {
  candidate: ExpertCandidate;
  records: SourceRecord[];
  rank: number;
  selected: boolean;
  compareSelected: boolean;
  onSelect: () => void;
  onToggleCompare: () => void;
  onInspect: () => void;
}

const STRENGTH_LABEL: Record<string, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
};

const STRENGTH_COLOR: Record<string, string> = {
  strong: 'text-accent-400 bg-accent-400/10 border-accent-400/30',
  moderate: 'text-gold-300 bg-gold-400/10 border-gold-400/30',
  weak: 'text-navy-400 bg-navy-700/30 border-navy-600',
};

const ROLE_LABEL: Record<string, string> = {
  expert: 'Identified as expert',
  ambiguous: 'Role ambiguous',
  mentioned: 'Mentioned only',
};

const ROLE_ICON: Record<string, typeof UserCheck> = {
  expert: UserCheck,
  ambiguous: HelpCircle,
  mentioned: HelpCircle,
};

export function CandidateCard({
  candidate,
  records,
  rank,
  selected,
  compareSelected,
  onSelect,
  onToggleCompare,
  onInspect,
}: CandidateCardProps) {
  const candidateRecords = records.filter((r) => candidate.recordIds.includes(r.id));
  const RoleIcon = ROLE_ICON[candidate.role] || HelpCircle;

  return (
    <div
      className={`card p-4 transition-all duration-200 cursor-pointer ${
        selected ? 'border-gold-400/40 bg-navy-900/80 shadow-lg shadow-navy-950/40' : 'hover:border-navy-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold ${
            rank <= 3 ? 'bg-gold-400/15 text-gold-400 border border-gold-400/30' : 'bg-navy-800 text-navy-400 border border-navy-700'
          }`}>
            {rank}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base text-white truncate">
                {candidate.name}
              </h3>
              {!candidate.nameReliable && (
                <span className="text-xs text-navy-500 italic">unverified</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <RoleIcon className={`w-3 h-3 ${
                candidate.role === 'expert' ? 'text-accent-400' : 'text-navy-500'
              }`} />
              <span className="text-xs text-navy-400">{ROLE_LABEL[candidate.role]}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-gold-400" />
            <span className="font-mono text-lg font-semibold text-white">{candidate.matchScore}</span>
          </div>
          <span className="text-[10px] text-navy-500 uppercase tracking-wider">match score</span>
        </div>
      </div>

      <p className="text-xs text-navy-300 leading-relaxed mb-3 line-clamp-2">
        {candidate.matchExplanation}
      </p>

      {candidate.documentedIssues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {candidate.documentedIssues.slice(0, 4).map((issue) => (
            <span key={issue} className="chip-inactive text-[10px]">
              {issue}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-navy-400" />
            <span className="text-xs text-navy-300">{candidate.recordCount} record{candidate.recordCount !== 1 ? 's' : ''}</span>
          </div>
          <span className={`chip text-[10px] ${STRENGTH_COLOR[candidate.evidenceStrength]}`}>
            {STRENGTH_LABEL[candidate.evidenceStrength]} evidence
          </span>
        </div>
      </div>

      {candidate.missingInfo.length > 0 && (
        <div className="mt-2.5 flex items-start gap-1.5 text-xs text-navy-500">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{candidate.missingInfo.length} items not found in available records</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-navy-800/50" onClick={(e) => e.stopPropagation()}>
        <button onClick={onInspect} className="btn-secondary text-xs px-3 py-1.5">
          <Eye className="w-3.5 h-3.5" />
          Inspect evidence
        </button>
        <button
          onClick={onToggleCompare}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
            compareSelected
              ? 'bg-gold-400/15 text-gold-300 border-gold-400/30'
              : 'text-navy-400 border-navy-700 hover:text-navy-300 hover:border-navy-600'
          }`}
        >
          {compareSelected ? 'In comparison' : 'Add to compare'}
        </button>
      </div>
    </div>
  );
}
