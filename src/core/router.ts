import { RewriteOptions, RewriteResult, RewriteLevel } from './types.js';
import { rewrite as claudeRewrite } from './rewrite.js';

export interface ModelConfig {
  name: string;
  provider: 'anthropic' | 'openai' | 'deepseek' | 'qwen';
  costPerToken: number;
  quality: 'high' | 'medium' | 'low';
  speed: 'fast' | 'medium' | 'slow';
}

export const MODELS: Record<string, ModelConfig> = {
  'claude': {
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    costPerToken: 0.003,
    quality: 'high',
    speed: 'medium',
  },
  'claude-haiku': {
    name: 'Claude Haiku',
    provider: 'anthropic',
    costPerToken: 0.0008,
    quality: 'medium',
    speed: 'fast',
  },
  'deepseek': {
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    costPerToken: 0.0001,
    quality: 'medium',
    speed: 'fast',
  },
  'qwen': {
    name: 'Qwen Plus',
    provider: 'qwen',
    costPerToken: 0.001,
    quality: 'medium',
    speed: 'medium',
  },
};

export interface RouterOptions {
  preferredModel?: string;
  balanceMode?: boolean;
  qualityFirst?: boolean;
}

export function selectModel(
  level: RewriteLevel,
  options: RouterOptions = {}
): string {
  const { qualityFirst = true } = options;

  if (qualityFirst) {
    switch (level) {
      case 'light':
        return process.env.DEFAULT_MODEL || 'claude-haiku';
      case 'medium':
        return process.env.DEFAULT_MODEL || 'claude';
      case 'deep':
        return 'claude';
      default:
        return 'claude';
    }
  }

  return 'deepseek';
}

export async function rewrite(
  text: string,
  options: RewriteOptions,
  routerOptions: RouterOptions = {}
): Promise<RewriteResult> {
  const model = selectModel(options.level || 'medium', routerOptions);

  console.log(`[Router] Selected model: ${model} for level: ${options.level || 'medium'}`);

  const result = await claudeRewrite(text, options);

  return {
    ...result,
    model: result.model,
  };
}
