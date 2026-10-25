FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@11.25.0 && pnpm install --prod --frozen-lockfile --ignore-scripts
COPY backend ./backend
COPY prototipo/dist ./prototipo/dist
COPY outputs/rotom-catalogo/modelo-catalogo.xlsx ./outputs/rotom-catalogo/modelo-catalogo.xlsx
ENV NODE_ENV=production ROTOM_PYTHON=python3
USER node
EXPOSE 10000
CMD ["node", "backend/server.mjs"]
