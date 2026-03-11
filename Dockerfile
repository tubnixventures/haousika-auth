# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for caching
COPY package*.json tsconfig.json ./

# Install dependencies (including dev for TypeScript build)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript -> dist/
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy only necessary files from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 3000

# Run compiled entrypoint
CMD ["node", "dist/index.js"]
