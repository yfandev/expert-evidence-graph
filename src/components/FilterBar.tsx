import { Filter, X } from 'lucide-react';
import type { SearchFilters } from '../types';

interface FilterBarProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  resultCount: number;
}

export function FilterBar({ filters, onChange, resultCount }: FilterBarProps) {
  return (
    <div className="card p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-navy-400">
        <Filter className="w-3.5 h-3.5" />
        <span>{resultCount} candidates</span>
      </div>

      <div className="h-5 w-px bg-navy-700" />

      <input
        type="text"
        placeholder="Filter by keyword..."
        value={filters.keyword}
        onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
        className="input flex-1 min-w-[140px] !py-1.5 !text-xs"
      />

      <select
        value={filters.jurisdiction}
        onChange={(e) => onChange({ ...filters, jurisdiction: e.target.value as SearchFilters['jurisdiction'] })}
        className="input !py-1.5 !text-xs w-auto"
      >
        <option value="all">All jurisdictions</option>
        <option value="federal">Federal</option>
        <option value="california">California</option>
      </select>

      <select
        value={filters.minEvidenceStrength}
        onChange={(e) => onChange({ ...filters, minEvidenceStrength: e.target.value as SearchFilters['minEvidenceStrength'] })}
        className="input !py-1.5 !text-xs w-auto"
      >
        <option value="weak">Any evidence</option>
        <option value="moderate">Moderate+</option>
        <option value="strong">Strong only</option>
      </select>

      <div className="flex items-center gap-2">
        <label className="text-xs text-navy-400">Min relevance</label>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.minRelevance}
          onChange={(e) => onChange({ ...filters, minRelevance: parseInt(e.target.value) })}
          className="w-20 accent-gold-400"
        />
        <span className="text-xs font-mono text-navy-300 w-8">{filters.minRelevance}</span>
      </div>

      {(filters.keyword || filters.jurisdiction !== 'all' || filters.minEvidenceStrength !== 'weak' || filters.minRelevance > 0) && (
        <button
          onClick={() => onChange({ keyword: '', jurisdiction: 'all', minEvidenceStrength: 'weak', minRelevance: 0 })}
          className="text-xs text-navy-500 hover:text-navy-300 transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
