import { useState } from 'react';
import { Scale, Search, Shield, AlertTriangle, ChevronDown } from 'lucide-react';
import type { Jurisdiction } from '../types';

interface LandingProps {
  onSearch: (description: string, jurisdiction: Jurisdiction, dataMode: 'live' | 'demo') => void;
  loading: boolean;
}

const EXAMPLES = [
  {
    label: 'Forensic accountant',
    text: 'I need a forensic accountant for a business dispute involving lost profits and business valuation.',
  },
  {
    label: 'Medical / TBI',
    text: 'Find potential medical experts associated with traumatic brain injury litigation.',
  },
  {
    label: 'Engineering',
    text: 'Find engineering experts mentioned in product liability litigation involving mechanical failures.',
  },
];

export function Landing({ onSearch, loading }: LandingProps) {
  const [description, setDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('all');

  const handleSubmit = (mode: 'live' | 'demo') => {
    if (!description.trim() || loading) return;
    onSearch(description.trim(), jurisdiction, mode);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-navy-800/50 backdrop-blur-md bg-navy-950/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-400/10 border border-gold-400/30 flex items-center justify-center">
              <Scale className="w-4 h-4 text-gold-400" />
            </div>
            <span className="font-serif text-lg text-white tracking-tight">Expert Evidence Graph</span>
          </div>
          <div className="text-xs text-navy-400 hidden sm:block">
            Powered by CourtListener public court records
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-3xl w-full animate-fade-in-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-800/60 border border-navy-700 text-xs text-navy-300 mb-6">
              <Shield className="w-3 h-3 text-accent-400" />
              Public court records · Traceable evidence · No confidential data required
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight text-balance mb-4">
              Find the expertise hidden in court records.
            </h1>
            <p className="text-navy-300 text-lg leading-relaxed max-w-2xl mx-auto">
              Explore public litigation records to discover potential experts, relevant cases, and evidence of subject-matter experience.
            </p>
          </div>

          <div className="card-elevated p-6 mb-4">
            <label className="label">Describe your case</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: I need an expert in forensic accounting for a lost profits dispute involving business valuation in California..."
              className="input min-h-[120px] resize-y font-sans text-sm leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit('live');
              }}
            />

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
              <div className="flex-1">
                <label className="label">Jurisdiction</label>
                <div className="relative">
                  <select
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
                    className="input appearance-none cursor-pointer pr-9"
                  >
                    <option value="all">All available jurisdictions</option>
                    <option value="federal">Federal courts</option>
                    <option value="california">California-related records</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-navy-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => handleSubmit('live')}
                  disabled={!description.trim() || loading}
                  className="btn-primary flex-1 sm:flex-none"
                >
                  <Search className="w-4 h-4" />
                  {loading ? 'Searching...' : 'Search records'}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-navy-500">Or try:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => setDescription(ex.text)}
                  className="chip-inactive hover:chip-active"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2.5 px-1 text-xs text-navy-400 leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 text-gold-400/70 flex-shrink-0 mt-0.5" />
            <p>
              This is a hackathon demo. Do not enter confidential, privileged, or sensitive case information.
              Results are research leads derived from public court records and require independent verification.
              The application does not identify the "best" expert or guarantee professional suitability.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-navy-500">
            <button
              onClick={() => handleSubmit('demo')}
              disabled={!description.trim() || loading}
              className="underline hover:text-navy-300 transition-colors"
            >
              Try with demo data instead
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-navy-800/50 py-4">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-navy-500">
          Expert Evidence Graph · Built for "Hacking with Public Data APIs" · Data from{' '}
          <a href="https://www.courtlistener.com" target="_blank" rel="noopener noreferrer" className="text-navy-400 hover:text-navy-300">
            CourtListener
          </a>
        </div>
      </footer>
    </div>
  );
}
