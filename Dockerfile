# Monaz Hotel & Café - Production Dockerfile for Google Cloud Run
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy dependency manifests
COPY package*.json ./

# Install dependencies including tsx for running server
RUN npm install --include=dev

# Copy application sources
COPY . .

# Build Vite frontend assets into /dist
RUN npm run build

# Expose port (Cloud Run sets PORT automatically)
EXPOSE 8080

# Start production server
CMD ["npm", "start"]
