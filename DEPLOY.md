# 部署指南

本项目推荐使用 **Railway** 部署完整服务（包含前端 + 后端 API）。

## 方案说明

Railway 是一个现代化的云部署平台：
- 每月 $5 免费额度（足够个人使用）
- 支持持久进程（适合 AI API 调用）
- 内置数据库、存储等
- 支持 Docker 部署

## 部署步骤

### 1. 准备代码

```bash
cd /Users/jianghoufen/AIGC
git init
git add .
git commit -m "Initial commit"
```

### 2. 推送到 GitHub

1. 登录 GitHub，创建新仓库（如 `academic-rewrite`）
2. 关联远程仓库并推送：

```bash
git remote add origin https://github.com/你的用户名/academic-rewrite.git
git push -u origin main
```

### 3. 部署到 Railway

1. 访问 [railway.app](https://railway.app)，用 GitHub 登录
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择刚才创建的仓库
4. Railway 会自动检测 Node.js 项目

### 4. 配置环境变量

在 Railway 项目设置中添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `ANTHROPIC_API_KEY` | `sk-xxx...` | Anthropic API 密钥（可选） |
| `DEEPSEEK_API_KEY` | `sk-xxx...` | DeepSeek API 密钥（必填） |
| `PORT` | `3000` | 端口号 |
| `HOST` | `0.0.0.0` | 监听地址 |

### 5. 获取部署 URL

部署完成后，Railway 会提供类似 `https://academic-rewrite.up.railway.app` 的 URL。

### 6. 配置前端 API 地址（可选）

如果需要独立部署前端，在 Railway 环境变量中添加：

| 变量名 | 值 |
|--------|-----|
| `ENV_API_URL` | `https://academic-rewrite.up.railway.app` |

## 本地开发

```bash
# 安装依赖
npm install

# 启动 API 服务
npm run dev:api

# 访问 http://localhost:3000
```

## 成本说明

| 项目 | 免费额度 | 超出后费用 |
|------|---------|-----------|
| Railway 计算 | $5/月 | $0.30/GB RAM-Hour |
| DeepSeek API | - | 按量计费（约 ¥1/百万 tokens） |
| Anthropic API | - | 按量计费 |

## 常见问题

**Q: Railway 部署失败？**
A: 检查 build 日志，确保 Node.js 版本兼容（推荐 20.x）

**Q: API 调用超时？**
A: Railway 默认超时时间较短，可以在 railway.json 中配置：

```json
{
  "deploy": {
    "timeout": 300
  }
}
```

**Q: 如何绑定自定义域名？**
A: 在 Railway 项目设置 → Domains 中添加自定义域名
