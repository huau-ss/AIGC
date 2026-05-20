# OpenClaw MCP 配置
# OpenClaw 支持 ACP (Agent Communication Protocol) 和 MCP 协议

# 方法 1: 使用 MCP Bridge
# OpenClaw 从 2026.03 开始支持 MCP Bridge

# 方法 2: 通过命令行启动
# openclaw mcp serve -- npx tsx src/mcp/server.ts

# 方法 3: 配置文件
# 在项目根目录创建 openclaw.config.json:

{
  "mcp": {
    "servers": {
      "academic-rewrite": {
        "command": "npx",
        "args": ["tsx", "src/mcp/server.ts"],
        "cwd": "/path/to/AIGC"
      }
    }
  }
}

# Claude Code 配置
# Claude Code 使用 ~/.claude/settings.json 或项目级配置

# 在项目根目录创建 .claude.json:

{
  "mcpServers": {
    "academic-rewrite": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}

# 或者全局配置:
# ~/.claude/settings.json
