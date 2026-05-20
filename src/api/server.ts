import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { rewrite } from '../core/router.js';
import { analyzeText, estimateAIGCRisk } from '../core/detector.js';
import type { RewriteRequest, RewriteResponse, HealthCheckResponse, RewriteResult, RewriteLevel } from '../core/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mammoth from 'mammoth';
import crypto from 'crypto';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: true,
});

const startTime = Date.now();

// HTML 缓存（启动时加载）
let indexHtmlCache: string;

interface CacheEntry {
  result: RewriteResult;
  timestamp: number;
}

const rewriteCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 60 秒缓存

// 清理过期缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rewriteCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      rewriteCache.delete(key);
    }
  }
}, 30 * 1000);

// 生成文本 hash
function generateHash(text: string, level: string, preserveTerms: string[]): string {
  const data = JSON.stringify({ text, level, preserveTerms: preserveTerms.sort() });
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
});

// 前端静态文件目录
const WEB_DIR = join(__dirname, '../../src/web');

await fastify.register(fastifyStatic, {
  root: WEB_DIR,
  prefix: '/',
  decorateReply: true,
  index: false, // 禁用自动返回 index.html，由自定义路由处理
});

// 初始化 HTML 缓存（启动时执行一次）
async function initHtmlCache(): Promise<void> {
  const fs = await import('fs');
  const fsPromise = await import('fs/promises');
  const htmlPath = join(WEB_DIR, 'index.html');
  
  // 同步读取一次，然后缓存
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // 注入 API URL
  const apiUrl = process.env.ENV_API_URL || '';
  html = html.replace(
    'window.ENV_API_URL = undefined;',
    `window.ENV_API_URL = ${apiUrl ? `'${apiUrl}'` : 'undefined'};`
  );
  
  indexHtmlCache = html;
  console.log('[Init] HTML cache loaded');
}

// 根路径返回缓存的 index.html
fastify.get('/', async (request, reply) => {
  reply.header('Content-Type', 'text/html');
  return indexHtmlCache;
});

await fastify.register(fastifyMultipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
});

fastify.get('/api/health', async (): Promise<HealthCheckResponse> => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
});

// File upload endpoint
fastify.post('/api/upload', async (request) => {
  try {
    const data = await request.file();

    if (!data) {
      return { success: false, error: 'No file uploaded' };
    }

    if (!data.filename.endsWith('.docx')) {
      return { success: false, error: 'Only .docx files are allowed' };
    }

    const buffer = await data.toBuffer();
    const result = await mammoth.extractRawText({ buffer });

    return {
      success: true,
      text: result.value,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    fastify.log.error(`Upload error: ${errorMessage}`);
    return { success: false, error: `Failed to parse document: ${errorMessage}` };
  }
});

fastify.post<{ Body: RewriteRequest }>(
  '/api/rewrite',
  async (request): Promise<RewriteResponse> => {
    const { text, level, preserveTerms, domain, preserveCitation } = request.body || {};

    if (!text || typeof text !== 'string') {
      return {
        success: false,
        error: 'Invalid request: text is required',
      };
    }

    if (text.length > 50000) {
      return {
        success: false,
        error: 'Text too long: maximum 50000 characters allowed',
      };
    }

    const effectiveLevel = level || 'medium';
    const effectiveTerms = preserveTerms || [];

    // 检查缓存
    const cacheKey = generateHash(text, effectiveLevel, effectiveTerms);
    const cached = rewriteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      fastify.log.info({ cacheKey }, 'Returning cached rewrite result');
      return {
        success: true,
        data: cached.result,
        cached: true,
      };
    }

    try {
      const result = await rewrite(text, {
        level: effectiveLevel,
        preserveTerms: effectiveTerms,
        domain,
        preserveCitation,
      });

      // 存入缓存
      rewriteCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error(`Rewrite error: ${errorMessage}`);

      return {
        success: false,
        error: `Rewrite failed: ${errorMessage}`,
      };
    }
  }
);

fastify.post<{ Body: { text: string } }>(
  '/api/analyze',
  async (request): Promise<{ success: boolean; data?: { analysis: ReturnType<typeof analyzeText>; risk: ReturnType<typeof estimateAIGCRisk> }; error?: string }> => {
    const { text } = request.body || {};

    if (!text || typeof text !== 'string') {
      return {
        success: false,
        error: 'Invalid request: text is required',
      };
    }

    try {
      const analysis = analyzeText(text);
      const risk = estimateAIGCRisk(text);

      return {
        success: true,
        data: { analysis, risk },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Analysis failed: ${errorMessage}`,
      };
    }
  }
);

fastify.post<{ Body: { texts: string[]; level?: string } }>(
  '/api/rewrite/batch',
  async (request): Promise<{ success: boolean; data?: RewriteResult[]; error?: string }> => {
    const { texts, level = 'medium' } = request.body || {};

    if (!Array.isArray(texts) || texts.length === 0) {
      return {
        success: false,
        error: 'Invalid request: texts array is required',
      };
    }

    if (texts.length > 10) {
      return {
        success: false,
        error: 'Too many texts: maximum 10 allowed per batch',
      };
    }

    try {
      // 对每个文本进行去重检查和改写
      const results: RewriteResult[] = [];

      for (const text of texts) {
        const cacheKey = generateHash(text, level, []);
        const cached = rewriteCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          fastify.log.info({ cacheKey }, 'Returning cached result for batch item');
          results.push(cached.result);
        } else {
          const result = await rewrite(text, {
            level: level as RewriteLevel,
          });

          rewriteCache.set(cacheKey, {
            result,
            timestamp: Date.now(),
          });

          results.push(result);
        }
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Batch rewrite failed: ${errorMessage}`,
      };
    }
  }
);

const start = async () => {
  try {
    // 初始化 HTML 缓存
    await initHtmlCache();
    
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { fastify };
