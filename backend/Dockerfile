FROM node:22-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install semua dependencies (include devDependencies untuk drizzle-kit)
RUN npm install

# Copy seluruh code
COPY . .

# Buat startup script yang otomatis migration + run server
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'echo "🔄 Running database migration..."' >> /app/entrypoint.sh && \
    echo 'npx drizzle-kit migrate || echo "⚠️ Migration skipped or failed"' >> /app/entrypoint.sh && \
    echo 'echo "✅ Starting server..."' >> /app/entrypoint.sh && \
    echo 'node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

EXPOSE 5000
CMD ["/app/entrypoint.sh"]