# Cursor MCP 配置
# 路径: .cursor/mcp.json (项目根目录) 或 ~/.cursor/mcp.json (全局)

# 使用方法:
# 1. 在项目根目录创建 .cursor/mcp.json
# 2. 或者在 ~/.cursor/mcp.json (全局)
# 3. 添加以下配置

{
  "mcpServers": {
    "academic-rewrite": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key-here"
      }
    }
  }
}

# 或者使用绝对路径:
# {
#   "mcpServers": {
#     "academic-rewrite": {
#       "command": "node",
#       "args": ["/Users/yourname/AIGC/dist/mcp/server.js"],
#       "env": {
#         "ANTHROPIC_API_KEY": "your-api-key-here"
#       }
#     }
#   }
# }

# 验证 MCP 连接:
# 1. 在 Cursor 中按 Cmd+Shift+P
# 2. 搜索 "MCP: Show Server Status"
# 3. 确认 academic-rewrite 显示为 Running

# 使用工具:
# 在 Cursor AI Chat 中，可以直接调用:
# - academic_rewrite: 改写学术文本
# - analyze_aigc_risk: 分析 AIGC 风险
# - batch_rewrite: 批量改写
