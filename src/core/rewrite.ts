import { RewriteOptions, RewriteResult, RewriteStrategy } from './types.js';
import 'dotenv/config';

export const STRATEGIES: Record<RewriteStrategy, { system: string; maxTokens: number }> = {
  light: {
    system: `你是一位学术写作助手。你的任务是对给定的学术文本进行轻度改写，保持原意不变，同时提升学术表达质量。

改写要求：
1. 保留原句的核心观点和学术术语
2. 优化句式，使其更加流畅自然
3. 适度替换同义词，但不要过度
4. 保持学术论文的正式语气
5. 中文表达要符合学术规范，避免口语化

输出格式：
- 只输出改写后的文本，不要额外解释
- 不要使用引号或特殊标记`,
    maxTokens: 4096,
  },
  medium: {
    system: `你是一位资深学术写作专家，专门帮助提升学术论文的质量和可读性。

你的任务是对给定的学术文本进行深度改写：
1. 重构句子结构，打破AI写作的固定模式
2. 改变句子的长度分布，增加变化
3. 调整信息密度，避免过度工整
4. 使用更加自然的学术表达
5. 注入人类写作的不规则性和个人特色
6. 保持学术严谨性，不改变核心内容

关键原则：
- AI文本往往过于平滑、均匀、规则
- 人类写作有高低信息密度的变化
- 适当使用短句增加节奏感
- 改变连接词的使用模式
- 不要使用模板化的学术套话

输出格式：
- 只输出改写后的文本
- 不要添加任何解释或注释`,
    maxTokens: 8192,
  },
  deep: {
    system: `你是一位顶尖的学术写作教练，专注于去除AI生成文本的痕迹。

深度改写策略：
1. 句法树重构：将主动句与被动句互换，改变主语位置
2. 逻辑重组：调整论证顺序，使用非对称结构
3. 熵值注入：增加信息密度的波动性
4. 困惑度扰动：混合使用简单句和复合句
5. 表达多样化：使用多种方式表达相同含义
6. 语义深化：加入背景说明和例外讨论

具体技术：
- 将"因此"替换为"鉴于此""考虑到""基于以上分析"等
- 将"首先...其次...最后"改为更自然的过渡
- 使用"事实上""值得注意的是""然而"等增加变化
- 适当打断长句，使用分号或破折号
- 加入作者的个人判断和限定词

目标：
- 让文本通过AIGC检测
- 同时保持甚至提升学术质量
- 让文本看起来像真实学者写的

输出格式：
- 只输出改写后的文本
- 不要任何解释、注释或标记`,
    maxTokens: 8192,
  },
};

// 智能文本分段 - 按段落和句子边界分段
function smartSplit(text: string, maxChars: number = 3000): string[] {
  const paragraphs = text.split(/\n+/).filter(p => p.trim());
  const segments: string[] = [];
  let currentSegment = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]+/g) || [paragraph];
      let tempSegment = '';

      for (const sentence of sentences) {
        if ((tempSegment + sentence).length > maxChars) {
          if (tempSegment) {
            segments.push(tempSegment.trim());
          }
          tempSegment = sentence;
        } else {
          tempSegment += sentence;
        }
      }
      if (tempSegment) {
        currentSegment = currentSegment ? currentSegment + '\n' + tempSegment : tempSegment;
      }
    } else if ((currentSegment + '\n' + paragraph).length > maxChars) {
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }
      currentSegment = paragraph;
    } else {
      currentSegment = currentSegment ? currentSegment + '\n' + paragraph : paragraph;
    }
  }

  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return segments;
}

async function callDeepSeek(
  messages: { role: string; content: string }[],
  maxTokens: number,
  timeout = 60000
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        max_tokens: maxTokens,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('DeepSeek API request timeout');
    }
    throw error;
  }
}

// 单段改写
async function rewriteSingleSegment(
  segment: string,
  context: { previousSegment?: string; segmentIndex: number; totalSegments: number },
  strategy: { system: string; maxTokens: number }
): Promise<string> {
  let userMessage = '';

  if (context.segmentIndex === 0) {
    userMessage = `这是学术论文的开头部分，请保持自然开头风格。\n\n${segment}`;
  } else {
    const previousHint = context.previousSegment
      ? `前文内容摘要：${context.previousSegment.slice(-200)}...`
      : '';
    userMessage = `这是论文的第 ${context.segmentIndex + 1}/${context.totalSegments} 部分。\n${previousHint}\n\n请确保与前文自然衔接，改写如下内容：\n\n${segment}`;
  }

  const messages = [
    { role: 'system', content: strategy.system },
    { role: 'user', content: userMessage },
  ];

  return callDeepSeek(messages, strategy.maxTokens);
}

export async function rewrite(
  text: string,
  options: RewriteOptions
): Promise<RewriteResult> {
  const { level = 'medium', preserveTerms = [] } = options;

  const strategy = STRATEGIES[level];

  const MAX_CHARS_PER_SEGMENT = 3000;
  const needsSplit = text.length > MAX_CHARS_PER_SEGMENT;

  const preserveContext = preserveTerms.length > 0
    ? `\n\n必须保留的专业术语：${preserveTerms.join(', ')}`
    : '';

  const modelUsed = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  let rewrittenText = '';

  if (needsSplit) {
    console.log(`[Rewrite] 长文本检测 (${text.length} 字符)，开始智能分段...`);
    const segments = smartSplit(text, MAX_CHARS_PER_SEGMENT);
    console.log(`[Rewrite] 分为 ${segments.length} 段进行处理`);

    const rewrittenSegments: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      console.log(`[Rewrite] 处理第 ${i + 1}/${segments.length} 段...`);

      const context = {
        previousSegment: i > 0 ? rewrittenSegments[i - 1] : undefined,
        segmentIndex: i,
        totalSegments: segments.length,
      };

      let segmentStrategy = strategy;
      if (i === segments.length - 1 && preserveContext) {
        segmentStrategy = {
          ...strategy,
          system: strategy.system + preserveContext,
        };
      }

      const segmentResult = await rewriteSingleSegment(segments[i], context, segmentStrategy);
      rewrittenSegments.push(segmentResult);
    }

    rewrittenText = rewrittenSegments.join('\n\n');
  } else {
    const userMessage = text + preserveContext;
    const messages = [
      { role: 'system', content: strategy.system },
      { role: 'user', content: userMessage },
    ];
    rewrittenText = await callDeepSeek(messages, strategy.maxTokens);
    console.log('[Rewrite] 使用 DeepSeek');
  }

  const changes: string[] = [];

  if (text !== rewrittenText) {
    changes.push('词汇优化');
  }

  if (level === 'medium' || level === 'deep') {
    changes.push('句式重构');
    changes.push('信息密度调整');
  }

  if (level === 'deep') {
    changes.push('熵值增强');
    changes.push('逻辑重组');
  }

  return {
    original: text,
    rewritten: rewrittenText,
    level,
    changes,
    model: modelUsed,
    timestamp: new Date().toISOString(),
  };
}
