FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || (echo "No lockfile, falling back to npm i" && npm i)

COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY tests ./tests
COPY README.md ./README.md
COPY .env.example ./
COPY scripts ./scripts

RUN npm run build && npm test

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY package.json README.md ./
CMD ["node", "--enable-source-maps", "dist/server.js"]

