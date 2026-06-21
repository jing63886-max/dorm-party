# ==================== 阶段1: 安装依赖 ====================
FROM docker.1ms.run/library/node:18-alpine AS deps

WORKDIR /app

COPY package.json ./

RUN npm install

# ==================== 阶段2: 构建 ====================
FROM docker.1ms.run/library/node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建时传入的环境变量（NEXT_PUBLIC_*）
ARG NEXT_PUBLIC_API_URL=http://localhost
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==================== 阶段3: 运行（standalone 模式） ====================
FROM docker.1ms.run/library/node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# standalone 输出模式只需要以下目录
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
