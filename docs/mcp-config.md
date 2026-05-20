# Claude Desktop MCP 配置
# 路径: ~/Library/Application Support/Claude/claude_desktop_config.json

# 使用方法:
# 1. 打开 ~/Library/Application Support/Claude/
# 2. 编辑 claude_desktop_config.json
# 3. 添加以下 mcpServers 配置

{
  "mcpServers": {
    "academic-rewrite": {
      "command": "node",
      "args": ["/path/to/AIGC/dist/mcp/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key-here"
      }
    }
  }
}
