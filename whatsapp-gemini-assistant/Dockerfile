# Use official lightweight Node.js LTS image
FROM node:22-slim

# Install Chromium and all necessary system libraries for headless Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    ca-certificates \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose directory for persistent authentication session
VOLUME ["/app/.wwebjs_auth"]

# Expose port for Render HTTP web server & health checks
EXPOSE 10000

# Start the bot
CMD ["npm", "start"]
