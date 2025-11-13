# Stage 1: Build application
FROM node:20-alpine AS builder

LABEL maintainer="CortexOps <support@cortexops.com>"
LABEL description="CortexOps - Professional Ansible Playbook Generator"
LABEL version="1.0.0"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source
COPY . .

# Build application
RUN npm run build

# Stage 2: Production image with Nginx
FROM nginx:alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Run as non-root user
USER nginx

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
