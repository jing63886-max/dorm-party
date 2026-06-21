# ==================== 阶段1: 安装依赖 ====================
FROM docker.1ms.run/library/node:18-alpine AS deps

WORKDIR /app

COPY package.json ./

RUN npm install --production

# ==================== 阶段2: 构建 ====================
FROM docker.1ms.run/library/node:18-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY src/ ./src/

RUN npm install
RUN npm run build

# ==================== 阶段3: 运行 ====================
FROM docker.1ms.run/library/node:18-alpine AS runner

WORKDIR /app

# 设置 Node.js 生产环境
ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# 复制构建产物和依赖
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 切换到非 root 用户
USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]
