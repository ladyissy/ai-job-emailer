# Step 1: Start with an official Node.js image
FROM node:18-slim

# Step 2: Install a more comprehensive list of dependencies for Puppeteer
RUN apt-get update \
    && apt-get install -y \
    ca-certificates \
    fonts-liberation \
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
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends

# Step 3: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 4: Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Step 5: Install project dependencies
RUN npm install

# Step 6: Use Puppeteer's own command to download a compatible browser
RUN npx puppeteer browsers install chrome

# --- KEY CHANGE: Explicitly tell Puppeteer where to find the browser ---
# This makes the setup robust and independent of unstable build caches.
# NOTE: The version number here corresponds to the one specified by the puppeteer version in package.json.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/src/app/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux/chrome

# Step 7: Copy the rest of your application's code
COPY . .

# Step 8: (Optional) Debugging step to verify file presence
RUN echo "--- Listing project files ---" && ls -la && echo "-------------------------"

# The command to run the application (overridden by Render's UI but good practice)
CMD [ "node", "-e", "require('./services/scheduler').runJobSearchProcess()" ]

