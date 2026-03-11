# Stage 1: Builder (includes dev dependencies for TypeScript)
FROM node:24-slim AS builder

WORKDIR /src

# Install all dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript (src → dist)
RUN npm run build

# Stage 2: Production (only runtime deps)
FROM node:24-slim AS production

WORKDIR /src

# Copy only package.json and lockfile
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled output from builder
COPY --from=builder /src/dist ./dist

# Healthcheck (uses PORT env variable, defaults to 3000)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Run the app
CMD ["node", "dist/index.js"]
