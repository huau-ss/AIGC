FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 编译 TypeScript
RUN npm run build

# 复制前端文件到 dist/web
RUN cp -r src/web dist/

EXPOSE ${PORT:-8080}

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8080}/api/health || exit 1

CMD ["node", "dist/api/server.js"]
