# Academic Rewrite Platform

AI-powered academic paper rewriting platform with MCP support.

## Features

- Academic text rewriting with multiple strategies
- MCP Server for Claude Code / OpenClaw / Cursor integration
- REST API with Fastify
- Multi-model routing (Claude / DeepSeek / Qwen)
- AIGC risk assessment
- Academic style conversion

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env and add your API keys
npm run dev:api
```

## API

```bash
# Rewrite text
curl -X POST http://localhost:3000/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{"text": "本研究采用实验方法进行分析", "level": "medium"}'

# Health check
curl http://localhost:3000/api/health
```

## MCP Server

```bash
npm run dev:mcp
```

Configure in Claude Code / Cursor:

```json
{
  "mcpServers": {
    "academic-rewrite": {
      "command": "npm",
      "args": ["run", "start:mcp"],
      "cwd": "/path/to/AIGC"
    }
  }
}
```

## Architecture

```
src/
├── api/server.ts       # Fastify REST API
├── mcp/server.ts        # MCP Server
├── core/
│   ├── rewrite.ts      # Core rewriting engine
│   ├── router.ts       # Model routing
│   └── detector.ts     # AIGC risk detection
└── index.ts            # Main entry
```

## License

MIT
