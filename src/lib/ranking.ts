import type {
  CaseRequirements,
  ExpertCandidate,
  GraphLink,
  GraphNode,
  ScoreBreakdown,
  SearchResult,
  SourceRecord,
  TechnicalIssue,
  EvidenceRole,
  LinkType,
} from '../types';

const AMBIGUOUS_INDICATORS = [
  'dr.', 'professor', 'physician', 'specialist', 'consultant',
  'analyst', 'examiner', 'investigator',
];

const NAME_PATTERN = /(?:Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Professor)?\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;

const EXCLUDE_NAMES = new Set([
  'The Court', 'The United States', 'United States', 'Supreme Court',
  'Circuit Court', 'District Court', 'Court Appeals', 'Federal Circuit',
  'New York', 'San Francisco', 'Los Angeles', 'Orange County',
  'Northern District', 'Southern District', 'Eastern District', 'Western District',
  'Case No', 'Case Number', 'No Evidence', 'See Also', 'Id At',
  'Cf Id', 'See Id', 'But See', 'See E.g', ' ante', ' supra', 'infra',
]);

interface RawApiResult {
  absolute_url: string;
  caseName: string;
  caseNameFull?: string;
  court: string;
  court_id: string;
  dateFiled: string | null;
  dateArgued?: string | null;
  citation?: string[];
  citeCount?: number;
  docketNumber?: string;
  docket_id?: number;
  judge?: string;
  cluster_id: number;
  status?: string;
  suitNature?: string;
  opinions?: Array<{
    id: number;
    snippet: string;
    type: string;
    per_curiam: boolean;
    plain_text?: string;
  }>;
  meta?: {
    score?: { bm25?: number };
  };
  snippet?: string;
}

function extractSnippet(result: RawApiResult): string {
  if (result.opinions && result.opinions.length > 0 && result.opinions[0].snippet) {
    return result.opinions[0].snippet;
  }
  if (result.snippet) return result.snippet;
  return '';
}

function extractCandidateText(result: RawApiResult): string {
  const fullText = result.opinions?.find((opinion) => opinion.plain_text)?.plain_text;
  return fullText || extractSnippet(result);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeName(name: string): string {
  const cleaned = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Professor)\s*/i, '').trim();
  return cleaned;
}

function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractNamePassages(text: string, name: string): string[] {
  const surname = name.split(' ').pop() || name;
  const fullNamePattern = escapeRegExp(name);
  const surnamePattern = escapeRegExp(surname);
  const mentionPattern = new RegExp(
    `\\b${fullNamePattern}\\b|\\b(?:Mr|Mrs|Ms|Dr|Prof|Professor)\\.?\\s+${surnamePattern}\\b`,
    'gi',
  );
  const passages = new Set<string>();

  for (const match of text.matchAll(mentionPattern)) {
    let start = match.index!;
    while (start > 0 && !/[.!?;]/.test(text[start - 1])) start--;

    let end = match.index! + match[0].length;
    while (end < text.length && !/[.!?;]/.test(text[end])) end++;

    const passage = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (passage) passages.add(passage);
  }

  return Array.from(passages).slice(0, 4);
}

function detectRole(
  snippet: string,
  name: string,
  nameIndex: number,
  titlePrefix: string,
): EvidenceRole {
  const lower = snippet.toLowerCase();
  const beforeName = lower.substring(Math.max(0, nameIndex - 80), nameIndex);
  const afterName = lower.substring(nameIndex + name.length, nameIndex + name.length + 100);
  const sentenceBefore = beforeName.split(/[.!?;]/).pop() || beforeName;
  const expertPrefix = /\b(?:expert|testifying|consulting)(?:\s+witness(?:es)?|\s+(?:opinion|report))?\s+$/.test(beforeName);
  const expertList = /\bexpert\s+witness(?:es)?\b[^.!?]*[\u2013\u2014:-]\s*[^.!?]*$/.test(sentenceBefore);
  const expertSuffix = /^\s*(?:,|[-\u2014])?\s*(?:(?:an?|the)\s+)?expert\b/.test(afterName);
  const expertRoleStatement = /^\s*(?:,\s*)?(?:(?:was|is|served as|retained as|testified as|qualified as|offered as|identified as|designated as)\s+)?(?:as\s+)?(?:an?\s+)?expert\b/.test(afterName);
  if (expertPrefix || expertList || expertSuffix || expertRoleStatement) return 'expert';

  const titled = /\b(?:dr\.?|prof\.?|professor)\s*$/i.test(titlePrefix);
  const professionPrefix = /\b(?:physician|specialist|consultant|analyst|examiner|investigator)\s+$/.test(beforeName);
  const professionSuffix = new RegExp(`^\\s*(?:,\\s*)?(?:(?:an?|the)\\s+)?(?:${AMBIGUOUS_INDICATORS.slice(2).join('|')})\\b`).test(afterName);
  if (titled || professionPrefix || professionSuffix) return 'ambiguous';
  return 'mentioned';
}

function extractCandidatesFromSnippet(
  snippet: string,
): Array<{ name: string; role: EvidenceRole; context: string }> {
  const text = stripHtml(snippet);
  const matches = Array.from(text.matchAll(NAME_PATTERN));
  const candidates = new Map<string, { name: string; role: EvidenceRole; context: string }>();

  for (const match of matches) {
    const name = normalizeName(match[1]);
    if (name.length < 5) continue;
    if (EXCLUDE_NAMES.has(name)) continue;
    if (name.split(' ').length < 2) continue;
    const context = extractNamePassages(text, name).join('\n');

    const nameIndex = match.index! + match[0].lastIndexOf(match[1]);
    const titlePrefix = match[0].slice(0, match[0].lastIndexOf(match[1]));
    const role = detectRole(text, name, nameIndex, titlePrefix);
    if (role === 'mentioned') continue;

    const key = nameKey(name);

    const existing = candidates.get(key);
    if (existing) {
      existing.context = Array.from(new Set([existing.context, context])).join('\n');
      if (role === 'expert') existing.role = role;
    } else {
      candidates.set(key, { name, role, context });
    }
  }
  return Array.from(candidates.values());
}

function scoreCandidate(
  candidate: { name: string; role: EvidenceRole; contexts: string[]; recordIds: string[] },
  reqs: CaseRequirements,
  records: SourceRecord[],
): ScoreBreakdown {
  let subjectRelevance = 0;
  let caseRelevance = 0;
  let evidenceSpecificity = 0;

  const allContext = candidate.contexts.join(' ').toLowerCase();
  for (const issue of reqs.technicalIssues) {
    if (allContext.includes(issue.toLowerCase())) {
      subjectRelevance += 15;
    }
  }
  const specialtyWords = reqs.expertSpecialty.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
  if (specialtyWords.length > 0 && specialtyWords.every((word) => allContext.includes(word))) {
    subjectRelevance += 20;
  }

  for (const record of records) {
    if (candidate.recordIds.includes(record.id)) {
      const recText = `${allContext} ${record.snippet} ${record.caseName}`.toLowerCase();
      for (const issue of reqs.technicalIssues) {
        if (recText.includes(issue.toLowerCase())) caseRelevance += 8;
      }
      for (const kw of reqs.legalKeywords) {
        if (recText.includes(kw.toLowerCase())) caseRelevance += 5;
      }
    }
  }

  if (candidate.role === 'expert') evidenceSpecificity += 25;
  else if (candidate.role === 'ambiguous') evidenceSpecificity += 12;
  else evidenceSpecificity += 3;

  if (reqs.evidencePreference === 'testimony') {
    if (candidate.role === 'expert' && candidate.contexts.some((c) => /testif|deposition|witness/i.test(c))) {
      evidenceSpecificity += 15;
    }
  }

  subjectRelevance = Math.min(subjectRelevance, 40);
  caseRelevance = Math.min(caseRelevance, 30);
  evidenceSpecificity = Math.min(evidenceSpecificity, 40);

  const recordCount = Math.min(candidate.recordIds.length * 5, 20);
  const total = subjectRelevance + caseRelevance + evidenceSpecificity + recordCount;

  return { subjectRelevance, caseRelevance, evidenceSpecificity, recordCount, total };
}

function determineEvidenceStrength(role: EvidenceRole, recordCount: number, score: ScoreBreakdown): 'strong' | 'moderate' | 'weak' {
  if (role === 'expert' && score.total >= 60) return 'strong';
  if (role === 'expert' || (recordCount >= 2 && score.total > 40)) return 'moderate';
  return 'weak';
}

function buildMatchExplanation(
  candidate: { name: string; role: EvidenceRole; contexts: string[] },
  score: ScoreBreakdown,
  reqs: CaseRequirements,
  records: SourceRecord[],
): string {
  const parts: string[] = [];
  const matchedIssues = reqs.technicalIssues.filter((issue) =>
    candidate.contexts.some((c) => c.toLowerCase().includes(issue.toLowerCase())),
  );
  if (matchedIssues.length > 0) {
    parts.push(`Appears in records discussing ${matchedIssues.slice(0, 3).join(', ')}.`);
  }
  if (candidate.role === 'expert') {
    parts.push('Identified as an expert in source text.');
  } else if (candidate.role === 'ambiguous') {
    parts.push('Mentioned with a professional title; expert role is not confirmed.');
  } {
    if (candidate.role === 'mentioned') parts.push('Named in relevant records; role not established.');
  }
  if (records.length > 0) {
    parts.push(`Found across ${candidate.contexts.length} passage${candidate.contexts.length !== 1 ? 's' : ''} in ${records.filter(r => candidate.contexts.length > 0).length} record(s).`);
  }
  return parts.join(' ');
}

function buildMissingInfo(role: EvidenceRole): string[] {
  const missing = [
    'Professional credentials and licensing',
    'Employment and institutional affiliation',
    'Contact information',
  ];
  if (role !== 'expert') {
    missing.unshift('Whether this person served as an expert witness');
  }
  missing.push('Whether testimony was accepted by the court');
  missing.push('Current availability and conflicts');
  return missing;
}

function buildGraph(
  candidates: ExpertCandidate[],
  records: SourceRecord[],
  issues: TechnicalIssue[],
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const MAX_NODES = 40;

  const topCandidates = candidates.slice(0, 8);
  for (const c of topCandidates) {
    nodes.push({
      id: `person-${c.id}`,
      type: 'person',
      label: c.name,
      meta: c.expertise.join(', ') || c.role,
      score: c.matchScore,
      candidateId: c.id,
    });
  }

  for (const r of records.slice(0, 15)) {
    nodes.push({
      id: `case-${r.id}`,
      type: 'case',
      label: r.caseName || 'Unknown case',
      meta: r.court,
      recordId: r.id,
    });
  }

  for (const issue of issues.slice(0, 10)) {
    nodes.push({
      id: `issue-${issue.id}`,
      type: 'issue',
      label: issue.label,
      issueId: issue.id,
    });
  }

  for (const c of topCandidates) {
    for (const rid of c.recordIds) {
      if (nodes.some((n) => n.id === `case-${rid}`)) {
        const linkType: LinkType = c.role === 'mentioned' ? 'inferred' : 'direct';
        links.push({
          source: `person-${c.id}`,
          target: `case-${rid}`,
          type: 'person-case',
          linkType,
          label: c.role === 'expert' ? 'expert in' : c.role === 'ambiguous' ? 'named in' : 'mentioned in',
        });
      }
    }
  }

  for (const issue of issues) {
    for (const cid of issue.candidateIds) {
      if (nodes.some((n) => n.id === `person-${cid}`)) {
        const linkType: LinkType = 'direct';
        links.push({
          source: `person-${cid}`,
          target: `issue-${issue.id}`,
          type: 'person-issue',
          linkType,
          label: 'associated with',
        });
      }
    }
    for (const rid of issue.recordIds) {
      if (nodes.some((n) => n.id === `case-${rid}`)) {
        const linkType: LinkType = 'direct';
        links.push({
          source: `case-${rid}`,
          target: `issue-${issue.id}`,
          type: 'case-issue',
          linkType,
          label: 'concerns',
        });
      }
    }
  }

  if (nodes.length > MAX_NODES) {
    const personNodes = nodes.filter((n) => n.type === 'person');
    const caseNodes = nodes.filter((n) => n.type === 'case').slice(0, 15);
    const issueNodes = nodes.filter((n) => n.type === 'issue').slice(0, 10);
    const keepIds = new Set([...personNodes, ...caseNodes, ...issueNodes].map((n) => n.id));
    return {
      nodes: nodes.filter((n) => keepIds.has(n.id)),
      links: links.filter((l) => keepIds.has(l.source) && keepIds.has(l.target)),
    };
  }

  return { nodes, links };
}

export function processResults(
  apiResults: RawApiResult[],
  reqs: CaseRequirements,
  query: string,
  dataMode: 'live' | 'demo',
  isDemoRecord = false,
): SearchResult {
  const records: SourceRecord[] = [];
  const candidateMap = new Map<string, {
    name: string;
    role: EvidenceRole;
    contexts: string[];
    recordIds: string[];
    supportingEvidence: Array<{ recordId: string; passage: string }>;
    expertise: Set<string>;
    documentedIssues: Set<string>;
  }>();
  const issueMap = new Map<string, { recordIds: Set<string>; candidateIds: Set<string> }>();

  for (const result of apiResults) {
    const recordId = `r-${result.cluster_id}`;
    const snippet = extractSnippet(result);
    const searchSnippet = stripHtml(snippet).slice(0, 600);
    const extracted = extractCandidatesFromSnippet(extractCandidateText(result));
    const cleanSnippet = searchSnippet;
    const recordCandidateIds: string[] = [];
    const recordIssueIds: string[] = [];

    for (const { name, role, context } of extracted) {
      const key = nameKey(name);
      if (!candidateMap.has(key)) {
        candidateMap.set(key, {
          name,
          role,
          contexts: [],
          recordIds: [],
          supportingEvidence: [],
          expertise: new Set(),
          documentedIssues: new Set(),
        });
      }
      const entry = candidateMap.get(key)!;
      if (!entry.contexts.includes(context)) entry.contexts.push(context);
      if (!entry.recordIds.includes(recordId)) entry.recordIds.push(recordId);
      const priorEvidence = entry.supportingEvidence.find((evidence) => evidence.recordId === recordId);
      if (priorEvidence) {
        priorEvidence.passage = Array.from(new Set([priorEvidence.passage, context])).join('\n');
      } else {
        entry.supportingEvidence.push({ recordId, passage: context });
      }
      if (role === 'expert' && entry.role !== 'expert') entry.role = role;
      else if (role === 'ambiguous' && entry.role === 'mentioned') entry.role = role;

      const matchedIssues = reqs.technicalIssues.filter((i) =>
        context.toLowerCase().includes(i.toLowerCase()),
      );
      for (const issue of matchedIssues) {
        entry.documentedIssues.add(issue);
        if (!issueMap.has(issue)) {
          issueMap.set(issue, { recordIds: new Set(), candidateIds: new Set() });
        }
        issueMap.get(issue)!.candidateIds.add(key);
        issueMap.get(issue)!.recordIds.add(recordId);
        recordIssueIds.push(issue);
      }

      const specialtyWords = reqs.expertSpecialty.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
      if (specialtyWords.length > 0 && specialtyWords.every((word) => context.toLowerCase().includes(word))) {
        entry.expertise.add(reqs.expertSpecialty);
      }
      recordCandidateIds.push(key);
    }

    for (const issue of reqs.technicalIssues) {
      if (searchSnippet.toLowerCase().includes(issue.toLowerCase()) && !recordIssueIds.includes(issue)) {
        recordIssueIds.push(issue);
        if (!issueMap.has(issue)) {
          issueMap.set(issue, { recordIds: new Set(), candidateIds: new Set() });
        }
        issueMap.get(issue)!.recordIds.add(recordId);
      }
    }

    const bm25 = result.meta?.score?.bm25 ?? null;
    records.push({
      id: recordId,
      caseName: result.caseName || 'Unknown case',
      court: result.court || 'Unknown court',
      jurisdiction: result.court_id || '',
      dateFiled: result.dateFiled || null,
      documentTitle: result.caseName || 'Court Opinion',
      snippet: cleanSnippet,
      absoluteUrl: result.absolute_url
        ? `https://www.courtlistener.com${result.absolute_url}`
        : '',
      snippetHtml: snippet || null,
      bm25,
      status: result.status || null,
      docketNumber: result.docketNumber || null,
      candidateIds: recordCandidateIds.map((k) => candidateMap.get(k)!.name),
      issueIds: recordIssueIds,
      isDemo: isDemoRecord,
    });
  }

  const candidates: ExpertCandidate[] = [];
  for (const [, entry] of candidateMap) {
    const candidateRecords = records.filter((r) => entry.recordIds.includes(r.id));
    const candidateContext = entry.contexts.join(' ').toLowerCase();
    const specialtyWords = reqs.expertSpecialty.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
    const hasSpecialtyEvidence = specialtyWords.length > 0 && specialtyWords.every((word) => candidateContext.includes(word));
    const hasIssueEvidence = reqs.technicalIssues.some((issue) => candidateContext.includes(issue.toLowerCase()));
    if (!hasSpecialtyEvidence && !hasIssueEvidence) continue;

    const score = scoreCandidate(entry, reqs, candidateRecords);
    if (score.total < 8) continue;

    const candidateId = nameKey(entry.name);
    const expertise = Array.from(entry.expertise);
    const documentedIssues = Array.from(entry.documentedIssues);

    candidates.push({
      id: candidateId,
      name: entry.name,
      nameReliable: entry.role === 'expert' || entry.role === 'ambiguous',
      expertise,
      supportingEvidence: entry.supportingEvidence,
      documentedIssues,
      matchScore: Math.round(score.total),
      matchExplanation: buildMatchExplanation(entry, score, reqs, candidateRecords),
      recordCount: entry.recordIds.length,
      evidenceStrength: determineEvidenceStrength(entry.role, entry.recordIds.length, score),
      role: entry.role,
      missingInfo: buildMissingInfo(entry.role),
      recordIds: entry.recordIds,
    });
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);

  for (const candidate of candidates) {
    candidate.recordIds = candidate.recordIds.filter((rid) =>
      records.some((r) => r.id === rid),
    );
  }

  const issues: TechnicalIssue[] = Array.from(issueMap.entries()).map(([label, sets]) => ({
    id: label.replace(/\s+/g, '-').toLowerCase(),
    label,
    recordIds: Array.from(sets.recordIds),
    candidateIds: Array.from(sets.candidateIds).map((nameKey) => nameKey),
  }));

  const { nodes: graphNodes, links: graphLinks } = buildGraph(candidates, records, issues);

  return {
    candidates: candidates.slice(0, 15),
    records: records.slice(0, 20),
    issues,
    graphNodes,
    graphLinks,
    requirements: reqs,
    dataMode,
    totalRecordsFound: records.length,
    query,
  };
}

export type { RawApiResult };
