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
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: true,
});

const startTime = Date.now();

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
});

// 根路径返回 index.html
fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
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

    try {
      const result = await rewrite(text, {
        level: level || 'medium',
        preserveTerms: preserveTerms || [],
        domain,
        preserveCitation,
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
      const results = await Promise.all(
        texts.map((text) =>
          rewrite(text, {
            level: level as RewriteLevel,
          })
        )
      );

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
