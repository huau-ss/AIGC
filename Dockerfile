FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 复制前端文件到 dist/web
COPY src/web dist/web

EXPOSE 3000

CMD ["node", "dist/api/server.js"]
