FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 复制前端文件到 dist/web（确保前端文件在构建输出中）
RUN mkdir -p dist && cp -r src/web dist/

EXPOSE ${PORT:-3000}

CMD ["node", "dist/api/server.js"]
