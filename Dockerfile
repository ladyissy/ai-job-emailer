# Step 1: Start with an official Node.js image
FROM node:18-slim

# Step 2: Install minimal dependencies needed for Puppeteer's browser
# This list is much shorter than installing the full Google Chrome.
RUN apt-get update \
    && apt-get install -y \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    --no-install-recommends

# Step 3: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 4: Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Step 5: Install project dependencies
RUN npm install

# Step 6: Use Puppeteer's own command to download a compatible browser
# This is the key change to solve the problem.
RUN npx puppeteer browsers install chrome

# Step 7: Copy the rest of your application's code
COPY . .

# Note: The CMD is not strictly necessary for Render Cron Jobs,
# as the "Start Command" in the UI will override it.
# But it's good practice to have it.
CMD [ "node", "-e", "require('./services/scheduler').runJobSearchProcess()" ]

