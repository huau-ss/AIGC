export type RewriteLevel = 'light' | 'medium' | 'deep';
export type RewriteStrategy = RewriteLevel;

export interface RewriteOptions {
  level?: RewriteLevel;
  preserveTerms?: string[];
  domain?: string;
  preserveCitation?: boolean;
}

export interface RewriteResult {
  original: string;
  rewritten: string;
  level: RewriteLevel;
  changes: string[];
  model: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
}

export interface RewriteResponse {
  success: boolean;
  data?: RewriteResult;
  error?: string;
  cached?: boolean;
}

export interface RewriteRequest {
  text: string;
  level?: RewriteLevel;
  preserveTerms?: string[];
  domain?: string;
  preserveCitation?: boolean;
}

export interface TextAnalysis {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  paragraphCount: number;
  hasCitation: boolean;
  academicTerms: string[];
  language: 'zh' | 'en' | 'mixed';
}

export interface AIGCAnalysisResult {
  score: number;
  risk: 'low' | 'medium' | 'high';
  features: {
    perplexity: number;
    burstiness: number;
    lexicalDiversity: number;
    sentenceLengthVariance: number;
  };
  flags: string[];
}
