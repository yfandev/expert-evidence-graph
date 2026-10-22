import type { RerankModifier } from '../types';

export const RERANK_MODIFIERS: RerankModifier[] = [
  {
    id: 'prioritize-testimony',
    label: 'Prioritize testimony evidence',
    description: 'Boost candidates appearing in records with explicit expert testimony',
    apply: (reqs) => ({ ...reqs, evidencePreference: 'testimony' }),
  },
  {
    id: 'focus-lost-profits',
    label: 'Focus on lost-profit damages',
    description: 'Add lost profits as a priority technical issue',
    apply: (reqs) => {
      const issues = reqs.technicalIssues.includes('lost profits')
        ? reqs.technicalIssues
        : [...reqs.technicalIssues, 'lost profits'];
      return { ...reqs, technicalIssues: issues };
    },
  },
  {
    id: 'focus-valuation',
    label: 'Focus on valuation expertise',
    description: 'Add business valuation as a priority technical issue',
    apply: (reqs) => {
      const issues = reqs.technicalIssues.includes('business valuation')
        ? reqs.technicalIssues
        : [...reqs.technicalIssues, 'business valuation'];
      return { ...reqs, technicalIssues: issues };
    },
  },
  {
    id: 'restrict-california',
    label: 'Restrict to California',
    description: 'Filter to California-related court records',
    apply: (reqs) => ({ ...reqs, jurisdiction: 'california' }),
  },
  {
    id: 'broaden-jurisdiction',
    label: 'Broaden to all jurisdictions',
    description: 'Remove jurisdiction restrictions',
    apply: (reqs) => ({ ...reqs, jurisdiction: 'all' }),
  },
];
