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

export interface TextAnalysis {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  paragraphCount: number;
  hasCitation: boolean;
  academicTerms: string[];
  language: 'zh' | 'en' | 'mixed';
}

export function analyzeText(text: string): TextAnalysis {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const sentences = text.split(/[。.!?；;！]/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  const hasCitation = /[\[|\(]\d+[\]|)]/.test(text) ||
                       /[A-Z][a-z]+ et al/.test(text) ||
                       /研究表明|根据.*[显示|表明|指出]/.test(text);

  const academicTerms = extractAcademicTerms(text);

  return {
    wordCount: chineseChars + englishWords,
    sentenceCount: sentences.length,
    avgSentenceLength: sentences.length > 0
      ? Math.round((chineseChars + englishWords) / sentences.length)
      : 0,
    paragraphCount: paragraphs.length,
    hasCitation,
    academicTerms,
    language: chineseChars > englishWords ? 'zh' : englishWords > 0 ? 'en' : 'zh',
  };
}

function extractAcademicTerms(text: string): string[] {
  const academicPatterns = [
    /研究表明|研究显示|实验表明|数据分析|统计结果|实证研究|理论框架|研究方法|研究结论/,
    /基于.*认为|从.*角度|通过.*分析|采用.*方法|利用.*技术|结合.*理论/,
    /具有.*优势|存在.*问题|面临.*挑战|涉及.*领域|属于.*范畴/,
  ];

  const terms: string[] = [];
  for (const pattern of academicPatterns) {
    const match = text.match(pattern);
    if (match) {
      terms.push(match[0]);
    }
  }

  return [...new Set(terms)];
}

export function estimateAIGCRisk(text: string): AIGCAnalysisResult {
  const analysis = analyzeText(text);

  const features = {
    perplexity: estimatePerplexity(text),
    burstiness: estimateBurstiness(text),
    lexicalDiversity: calculateLexicalDiversity(text),
    sentenceLengthVariance: calculateSentenceLengthVariance(text),
  };

  let riskScore = 50;

  if (features.perplexity < 0.4) riskScore += 25;
  if (features.burstiness < 0.3) riskScore += 20;
  if (features.lexicalDiversity < 0.5) riskScore += 15;
  if (features.sentenceLengthVariance < 0.2) riskScore += 20;

  const flags: string[] = [];
  if (features.perplexity < 0.4) flags.push('困惑度过低');
  if (features.burstiness < 0.3) flags.push('句子突发性不足');
  if (features.lexicalDiversity < 0.5) flags.push('词汇多样性低');
  if (features.sentenceLengthVariance < 0.2) flags.push('句长变化过小');
  if (analysis.avgSentenceLength > 30) flags.push('平均句长偏长');

  const risk: 'low' | 'medium' | 'high' =
    riskScore < 40 ? 'low' : riskScore < 70 ? 'medium' : 'high';

  return {
    score: Math.min(100, Math.max(0, riskScore)),
    risk,
    features,
    flags,
  };
}

function estimatePerplexity(text: string): number {
  const avgLength = text.length / (text.split(/[。.!?]/).length || 1);
  const normalized = Math.min(1, avgLength / 25);
  return 0.3 + (normalized * 0.7);
}

function estimateBurstiness(text: string): number {
  const sentences = text.split(/[。.!?]/).filter(s => s.trim().length > 0);
  if (sentences.length < 3) return 0.8;

  const lengths = sentences.map(s => s.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;

  const normalizedVariance = Math.min(1, Math.sqrt(variance) / mean);
  return 0.2 + (normalizedVariance * 0.8);
}

function calculateLexicalDiversity(text: string): number {
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
  const uniqueChars = new Set(chineseChars);
  return chineseChars.length > 0
    ? uniqueChars.size / chineseChars.length
    : 0.5;
}

function calculateSentenceLengthVariance(text: string): number {
  const sentences = text.split(/[。.!?]/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return 1;

  const lengths = sentences.map(s => s.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;

  return Math.min(1, Math.sqrt(variance) / (mean || 1));
}
