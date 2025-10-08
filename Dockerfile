# Step 1: Start with an official Node.js image
FROM node:18-slim

# Step 2: Install dependencies needed to run Headless Chrome
# We update the package list and install the necessary libraries.
RUN apt-get update && apt-get install -y \
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

# Step 3: Download and install the latest stable version of Google Chrome
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb

# Step 4: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 5: Copy package.json and package-lock.json
COPY package*.json ./

# Step 6: Install project dependencies
RUN npm install

# Step 7: Copy the rest of your application's code
COPY . .

# Note: The CMD is not strictly necessary for Render Cron Jobs,
# as the "Start Command" in the UI will override it.
# But it's good practice to have it.
CMD [ "node", "-e", "require('./services/scheduler').runJobSearchProcess()" ]
