export type Jurisdiction = 'all' | 'federal' | 'california';

export type DataMode = 'live' | 'demo';

export interface CaseRequirements {
  rawDescription: string;
  subjectArea: string;
  expertSpecialty: string;
  technicalIssues: string[];
  legalKeywords: string[];
  jurisdiction: Jurisdiction;
  evidencePreference: 'any' | 'testimony';
}

export type EvidenceRole = 'expert' | 'ambiguous' | 'mentioned';

export type LinkType = 'direct' | 'inferred';

export interface ExpertCandidate {
  id: string;
  name: string;
  nameReliable: boolean;
  expertise: string[];
  documentedIssues: string[];
  matchScore: number;
  matchExplanation: string;
  recordCount: number;
  evidenceStrength: 'strong' | 'moderate' | 'weak';
  role: EvidenceRole;
  missingInfo: string[];
  recordIds: string[];
}

export interface SourceRecord {
  id: string;
  caseName: string;
  court: string;
  jurisdiction: string;
  dateFiled: string | null;
  documentTitle: string;
  snippet: string;
  absoluteUrl: string;
  snippetHtml: string | null;
  bm25: number | null;
  status: string | null;
  docketNumber: string | null;
  candidateIds: string[];
  issueIds: string[];
  isDemo: boolean;
}

export interface TechnicalIssue {
  id: string;
  label: string;
  recordIds: string[];
  candidateIds: string[];
}

export type GraphNodeType = 'person' | 'case' | 'issue';
export type GraphLinkType = 'person-case' | 'person-issue' | 'case-issue';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  meta?: string;
  score?: number;
  candidateId?: string;
  recordId?: string;
  issueId?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: GraphLinkType;
  linkType: LinkType;
  label?: string;
}

export interface SearchResult {
  candidates: ExpertCandidate[];
  records: SourceRecord[];
  issues: TechnicalIssue[];
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
  requirements: CaseRequirements;
  dataMode: DataMode;
  totalRecordsFound: number;
  query: string;
  whatChanged?: string;
}

export interface SearchFilters {
  keyword: string;
  jurisdiction: Jurisdiction;
  minEvidenceStrength: 'strong' | 'moderate' | 'weak';
  minRelevance: number;
}

export interface RerankModifier {
  id: string;
  label: string;
  description: string;
  apply: (reqs: CaseRequirements) => CaseRequirements;
}

export interface ScoreBreakdown {
  subjectRelevance: number;
  caseRelevance: number;
  evidenceSpecificity: number;
  recordCount: number;
  total: number;
}
