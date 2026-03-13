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

# Install Redis
RUN apt-get update && apt-get install -y redis-server && rm -rf /var/lib/apt/lists/*

# Copy built app from builder
COPY --from=builder /src/dist ./dist
COPY --from=builder /src/package*.json ./

# Install only production deps
RUN npm ci --only=production

# Create a startup script
RUN echo '#!/bin/bash\nredis-server --daemonize yes\nnpm start' > /start.sh && chmod +x /start.sh

# Expose ports
EXPOSE 3000 6379

# Start both Redis and the app
CMD ["/start.sh"]
