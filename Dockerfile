FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 编译 TypeScript
RUN npm run build

# 复制前端文件到 dist/web
RUN cp -r src/web dist/

EXPOSE ${PORT:-3000}

CMD ["node", "dist/api/server.js"]
