import { RewriteOptions, RewriteResult } from './types.js';
import { rewrite as deepseekRewrite } from './rewrite.js';

export interface RouterOptions {
  preferredModel?: string;
  balanceMode?: boolean;
  qualityFirst?: boolean;
}

export async function rewrite(
  text: string,
  options: RewriteOptions,
  _routerOptions: RouterOptions = {}
): Promise<RewriteResult> {
  const result = await deepseekRewrite(text, options);
  return {
    ...result,
    model: result.model,
  };
}
