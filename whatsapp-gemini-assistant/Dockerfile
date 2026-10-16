# Ultra-lightweight Node.js LTS image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose port for Render HTTP web server & health checks
EXPOSE 10000

# Start the bot
CMD ["node", "index.js"]
