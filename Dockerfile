FROM oven/bun:1

WORKDIR /app

# Install dependencies
# Copy package.json and bun.lock
COPY package.json bun.lock ./
# Install production dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Expose the application port
EXPOSE 3000

# Set default environment variable for books directory
ENV BOOKS_DIR=/books

# Run the application
CMD ["bun", "run", "src/index.ts"]
