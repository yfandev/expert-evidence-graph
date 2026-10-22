import { useState } from 'react';
import { Sliders, X, Check } from 'lucide-react';
import type { CaseRequirements, Jurisdiction } from '../types';

interface RequirementsPanelProps {
  requirements: CaseRequirements;
  onChange: (reqs: CaseRequirements) => void;
  onRerank: () => void;
  loading: boolean;
}

export function RequirementsPanel({ requirements, onChange, onRerank, loading }: RequirementsPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CaseRequirements>(requirements);

  const handleSave = () => {
    onChange(draft);
    setOpen(false);
    onRerank();
  };

  const updateField = (field: keyof CaseRequirements, value: unknown) => {
    setDraft({ ...draft, [field]: value });
  };

  const updateIssues = (text: string) => {
    const issues = text.split(',').map((s) => s.trim()).filter(Boolean);
    updateField('technicalIssues', issues);
  };

  const updateKeywords = (text: string) => {
    const keywords = text.split(',').map((s) => s.trim()).filter(Boolean);
    updateField('legalKeywords', keywords);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-gold-400" />
          <h3 className="text-sm font-medium text-white">Extracted search requirements</h3>
        </div>
        <button
          onClick={() => { setDraft(requirements); setOpen(!open); }}
          className="text-xs text-navy-400 hover:text-white transition-colors"
        >
          {open ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {!open ? (
        <div className="space-y-2.5">
          <RequirementRow label="Subject area" value={requirements.subjectArea} />
          <RequirementRow label="Expert specialty" value={requirements.expertSpecialty} />
          <RequirementRow
            label="Technical issues"
            value={requirements.technicalIssues.join(', ') || 'None detected'}
          />
          <RequirementRow
            label="Legal keywords"
            value={requirements.legalKeywords.join(', ') || 'None detected'}
          />
          <RequirementRow
            label="Jurisdiction"
            value={jurisdictionLabel(requirements.jurisdiction)}
          />
          <RequirementRow
            label="Evidence preference"
            value={requirements.evidencePreference === 'testimony' ? 'Prefer testimony' : 'Any evidence'}
          />
        </div>
      ) : (
        <div className="space-y-3 animate-scale-in">
          <div>
            <label className="label">Subject area</label>
            <input
              type="text"
              value={draft.subjectArea}
              onChange={(e) => updateField('subjectArea', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Expert specialty</label>
            <input
              type="text"
              value={draft.expertSpecialty}
              onChange={(e) => updateField('expertSpecialty', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Technical issues (comma-separated)</label>
            <input
              type="text"
              value={draft.technicalIssues.join(', ')}
              onChange={(e) => updateIssues(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Legal keywords (comma-separated)</label>
            <input
              type="text"
              value={draft.legalKeywords.join(', ')}
              onChange={(e) => updateKeywords(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Jurisdiction</label>
            <select
              value={draft.jurisdiction}
              onChange={(e) => updateField('jurisdiction', e.target.value as Jurisdiction)}
              className="input"
            >
              <option value="all">All available jurisdictions</option>
              <option value="federal">Federal courts</option>
              <option value="california">California-related records</option>
            </select>
          </div>
          <div>
            <label className="label">Evidence preference</label>
            <select
              value={draft.evidencePreference}
              onChange={(e) => updateField('evidencePreference', e.target.value as 'any' | 'testimony')}
              className="input"
            >
              <option value="any">Any evidence</option>
              <option value="testimony">Prefer expert testimony</option>
            </select>
          </div>
          <button onClick={handleSave} disabled={loading} className="btn-primary w-full">
            <Check className="w-4 h-4" />
            Apply &amp; re-rank
          </button>
        </div>
      )}
    </div>
  );
}

function RequirementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-navy-400 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-navy-100">{value}</span>
    </div>
  );
}

function jurisdictionLabel(j: Jurisdiction): string {
  switch (j) {
    case 'federal': return 'Federal courts';
    case 'california': return 'California-related records';
    default: return 'All available jurisdictions';
  }
}
