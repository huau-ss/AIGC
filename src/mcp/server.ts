import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { rewrite } from '../core/router.js';
import { analyzeText, estimateAIGCRisk } from '../core/detector.js';
import type { RewriteLevel } from '../core/types.js';

const TOOLS: Tool[] = [
  {
    name: 'academic_rewrite',
    description: 'Rewrite academic text to improve quality and reduce AI-generated characteristics. Use this when the user wants to improve academic writing, reduce AIGC detection rate, or convert text to more natural academic style.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The academic text to rewrite',
        },
        level: {
          type: 'string',
          enum: ['light', 'medium', 'deep'],
          description: 'Rewriting intensity level: light (minor improvements), medium (sentence restructuring), deep (major changes to bypass AIGC detection)',
          default: 'medium',
        },
        preserve_terms: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of academic terms that must be preserved exactly as-is',
        },
        domain: {
          type: 'string',
          description: 'Academic domain (e.g., "computer science", "medicine", "economics") to provide context-aware rewriting',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'analyze_aigc_risk',
    description: 'Analyze text for AI-generated characteristics and estimate AIGC detection risk. Returns detailed analysis including perplexity, burstiness, lexical diversity, and specific flags that may trigger AI detectors.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to analyze for AI-generated characteristics',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'batch_rewrite',
    description: 'Rewrite multiple text passages at once. Useful for processing full papers or multiple paragraphs. Maximum 10 passages per batch.',
    inputSchema: {
      type: 'object',
      properties: {
        texts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of text passages to rewrite',
        },
        level: {
          type: 'string',
          enum: ['light', 'medium', 'deep'],
          description: 'Rewriting intensity level',
          default: 'medium',
        },
      },
      required: ['texts'],
    },
  },
];

const server = new Server(
  {
    name: 'academic-rewrite-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    if (name === 'academic_rewrite') {
      const text = args.text as string;
      const result = await rewrite(text, {
        level: (args.level as RewriteLevel) || 'medium',
        preserveTerms: (args.preserve_terms as string[]) || [],
        domain: args.domain as string | undefined,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'analyze_aigc_risk') {
      const text = args.text as string;
      const analysis = analyzeText(text);
      const risk = estimateAIGCRisk(text);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ analysis, risk }, null, 2),
          },
        ],
      };
    }

    if (name === 'batch_rewrite') {
      const texts = args.texts as string[];
      const level = (args.level as RewriteLevel) || 'medium';

      if (texts.length > 10) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Maximum 10 texts allowed per batch',
            },
          ],
          isError: true,
        };
      }

      const results = await Promise.all(
        texts.map((text) =>
          rewrite(text, { level })
        )
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Academic Rewrite MCP Server running...');
}

runServer().catch(console.error);
