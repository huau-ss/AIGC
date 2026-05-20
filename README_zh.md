# Academic Rewrite Platform

**注意**: 本项目是技术演示用。实际部署需要：
1. 填写 `.env` 中的 API Key
2. 运行 `npm install && npm run dev:api`
3. Web 界面访问 `http://localhost:3000/src/web/index.html`

## 快速启动

```bash
npm install
cp .env.example .env
# 编辑 .env 添加你的 API Key
npm run dev:api
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| POST | /api/rewrite | 文本改写 |
| POST | /api/analyze | AIGC 风险分析 |
| POST | /api/rewrite/batch | 批量改写 |

## MCP Server

配置到 Claude Code / Cursor:

```json
{
  "mcpServers": {
    "academic-rewrite": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/path/to/AIGC"
    }
  }
}
```

## 技术栈

- **运行时**: Node.js + TypeScript
- **框架**: Fastify
- **AI**: Claude (Anthropic)
- **MCP**: @modelcontextprotocol/sdk

## 法律声明

本工具仅用于提升学术写作质量。请遵守所在机构的学术诚信政策。
