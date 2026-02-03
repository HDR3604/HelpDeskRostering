FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm (use version matching lockfile v6.0)
RUN corepack enable && corepack prepare pnpm@8.10.5 --activate

# Install dependencies first (better caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build args for environment variables
ARG VITE_API_BASE_URL
# ARG VITE_SUPABASE_URL
# ARG VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
# ENV VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

# Build the app
RUN pnpm build

# Production image
FROM node:20-alpine

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy the built output
COPY --from=builder /app/.output ./.output

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3000

# Run the Nitro server
CMD ["node", ".output/server/index.mjs"]