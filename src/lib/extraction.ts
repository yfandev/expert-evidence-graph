import type { CaseRequirements, Jurisdiction } from '../types';

const SPECIALTY_MAP: Record<string, { specialty: string; subject: string; issues: string[] }> = {
  'forensic accountant': { specialty: 'Forensic Accounting', subject: 'Business & Finance', issues: ['lost profits', 'business valuation', 'financial damages', 'accounting fraud'] },
  'forensic accounting': { specialty: 'Forensic Accounting', subject: 'Business & Finance', issues: ['lost profits', 'business valuation', 'financial damages', 'accounting fraud'] },
  'medical expert': { specialty: 'Medical / Clinical', subject: 'Medicine', issues: ['medical causation', 'standard of care', 'medical malpractice', 'diagnosis'] },
  'neurologist': { specialty: 'Neurology', subject: 'Medicine', issues: ['traumatic brain injury', 'neurological damage', 'concussion', 'cognitive impairment'] },
  'orthopedic': { specialty: 'Orthopedic Surgery', subject: 'Medicine', issues: ['musculoskeletal injury', 'joint damage', 'spinal injury', 'fractures'] },
  'engineering expert': { specialty: 'Engineering', subject: 'Engineering', issues: ['mechanical failure', 'product design', 'structural analysis', 'failure analysis'] },
  'mechanical engineer': { specialty: 'Mechanical Engineering', subject: 'Engineering', issues: ['mechanical failure', 'product design', 'machinery', 'failure analysis'] },
  'accident reconstruction': { specialty: 'Accident Reconstruction', subject: 'Engineering', issues: ['vehicle dynamics', 'crash analysis', 'skid marks', 'impact analysis'] },
  'toxicologist': { specialty: 'Toxicology', subject: 'Medicine', issues: ['chemical exposure', 'toxic exposure', 'poisoning', 'environmental contamination'] },
  'psychologist': { specialty: 'Psychology', subject: 'Mental Health', issues: ['emotional distress', 'psychological evaluation', 'mental health', 'cognitive assessment'] },
  'economist': { specialty: 'Economic Damages', subject: 'Economics', issues: ['lost earnings', 'economic damages', 'future income', 'present value'] },
  'vocational': { specialty: 'Vocational Rehabilitation', subject: 'Economics', issues: ['employability', 'lost earning capacity', 'vocational assessment', 'labor market'] },
  'fire investigator': { specialty: 'Fire Investigation', subject: 'Engineering', issues: ['fire cause', 'arson', 'origin analysis', 'combustion'] },
  'patent': { specialty: 'Patent / IP', subject: 'Intellectual Property', issues: ['patent validity', 'prior art', 'infringement', 'claim construction'] },
  'pharmaceutical': { specialty: 'Pharmaceutical Sciences', subject: 'Medicine', issues: ['drug safety', 'pharmacology', 'side effects', 'clinical trials'] },
  'construction': { specialty: 'Construction', subject: 'Engineering', issues: ['construction defects', 'building code', 'structural integrity', 'contractor negligence'] },
  'environmental': { specialty: 'Environmental Science', subject: 'Environment', issues: ['environmental contamination', 'pollution', 'site assessment', 'remediation'] },
  'securities': { specialty: 'Securities / Finance', subject: 'Business & Finance', issues: ['securities fraud', 'material misrepresentation', '10b-5', 'insider trading'] },
  'antitrust': { specialty: 'Economics / Antitrust', subject: 'Economics', issues: ['market power', 'price fixing', 'monopolization', 'consumer welfare'] },
  'product liability': { specialty: 'Product Engineering', subject: 'Engineering', issues: ['design defect', 'manufacturing defect', 'failure to warn', 'product safety'] },
};

const LEGAL_KEYWORDS = [
  'expert witness', 'expert testimony', 'expert opinion', 'forensic',
  'deposition', 'daubert', 'kumho tire', 'fed. r. evid. 702', 'fre 702',
  'qualifications', 'methodology', 'peer review', 'reliability',
  'lost profits', 'damages', 'liability', 'malpractice', 'negligence',
  'product liability', 'wrongful death', 'personal injury',
  'traumatic brain injury', 'tbi', 'valuation', 'business valuation',
  'mechanical failure', 'design defect', 'standard of care',
  'causation', 'exposure', 'injury', 'fraud',
];

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function extractTechnicalIssues(text: string): string[] {
  const lower = normalize(text);
  const issues = new Set<string>();
  for (const [, info] of Object.entries(SPECIALTY_MAP)) {
    for (const issue of info.issues) {
      if (lower.includes(issue)) issues.add(issue);
    }
  }
  const directIssues = [
    'lost profits', 'business valuation', 'financial damages', 'accounting fraud',
    'traumatic brain injury', 'neurological damage', 'concussion', 'cognitive impairment',
    'mechanical failure', 'product design', 'design defect', 'manufacturing defect',
    'standard of care', 'medical causation', 'medical malpractice',
    'securities fraud', 'market power', 'price fixing',
    'construction defects', 'building code',
    'environmental contamination', 'chemical exposure',
    'fire cause', 'arson',
    'patent validity', 'prior art',
    'employability', 'lost earning capacity',
    'emotional distress', 'psychological evaluation',
  ];
  for (const issue of directIssues) {
    if (lower.includes(issue)) issues.add(issue);
  }
  return Array.from(issues);
}

function detectSpecialty(text: string): { specialty: string; subject: string; issues: string[] } | null {
  const lower = normalize(text);
  let bestMatch: { specialty: string; subject: string; issues: string[] } | null = null;
  let bestLen = 0;
  for (const [key, info] of Object.entries(SPECIALTY_MAP)) {
    if (lower.includes(key) && key.length > bestLen) {
      bestMatch = info;
      bestLen = key.length;
    }
  }
  if (bestMatch) return bestMatch;
  for (const [key, info] of Object.entries(SPECIALTY_MAP)) {
    for (const issue of info.issues) {
      if (lower.includes(issue) && key.length > bestLen) {
        bestMatch = info;
        bestLen = key.length;
      }
    }
  }
  return bestMatch;
}

function extractLegalKeywords(text: string): string[] {
  const lower = normalize(text);
  const found = new Set<string>();
  for (const kw of LEGAL_KEYWORDS) {
    if (lower.includes(kw)) found.add(kw);
  }
  return Array.from(found).slice(0, 8);
}

function detectJurisdiction(text: string): Jurisdiction {
  const lower = normalize(text);
  if (/(federal|u\.s\.|united states|federal court|circuit)/.test(lower)) return 'federal';
  if (/(california|calif\.|cal\.|ca\b|los angeles|san francisco|ninth circuit|cal\. ct\.|ca9)/.test(lower)) return 'california';
  return 'all';
}

function detectEvidencePreference(text: string): 'any' | 'testimony' {
  const lower = normalize(text);
  if (/(testimony|testif|deposition|witness|testified|testifying)/.test(lower)) return 'testimony';
  return 'any';
}

export function extractRequirements(description: string): CaseRequirements {
  const specialty = detectSpecialty(description);
  const issues = extractTechnicalIssues(description);
  const keywords = extractLegalKeywords(description);
  const jurisdiction = detectJurisdiction(description);

  return {
    rawDescription: description,
    subjectArea: specialty?.subject || 'Legal Research',
    expertSpecialty: specialty?.specialty || 'Expert Witness',
    technicalIssues: issues,
    legalKeywords: keywords,
    jurisdiction,
    evidencePreference: 'any',
  };
}

export function updateEvidencePreference(reqs: CaseRequirements): CaseRequirements {
  return {
    ...reqs,
    evidencePreference: detectEvidencePreference(reqs.rawDescription) === 'testimony' ? 'testimony' : reqs.evidencePreference,
  };
}

export function buildSearchQuery(reqs: CaseRequirements): string {
  const terms: string[] = [];
  const baseTerms = [reqs.expertSpecialty, ...reqs.technicalIssues].filter(Boolean);
  if (baseTerms.length === 0) {
    terms.push(reqs.rawDescription.slice(0, 100));
  } else {
    for (const t of baseTerms.slice(0, 4)) {
      const cleaned = t.replace(/[()]/g, '').trim();
      if (!cleaned) continue;
      if (cleaned.includes(' ')) {
        terms.push(`"${cleaned}"`);
      } else {
        terms.push(cleaned);
      }
    }
  }
  let query = terms.slice(0, 3).join(' AND ');
  if (reqs.evidencePreference === 'testimony') {
    query += ' AND ("expert witness" OR "expert testimony")';
  }
  return query;
}

export function getCourtFilter(jurisdiction: Jurisdiction): string | undefined {
  switch (jurisdiction) {
    case 'federal':
      return undefined;
    case 'california':
      return 'cal calctapp cand cavb cacd caed';
    default:
      return undefined;
  }
}
