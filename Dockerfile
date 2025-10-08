# Step 1: Use a more feature-complete base image that's better for browsers
FROM node:18-bullseye

# Step 2: Set up the working directory
WORKDIR /usr/src/app

# Step 3: Install Google Chrome and required dependencies
# This is a more robust method using Google's official repository
RUN apt-get update && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Step 4: Copy package.json and package-lock.json
COPY package*.json ./

# Step 5: Install project dependencies.
# We skip the Puppeteer browser download because we've installed a system one.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install

# Step 6: Copy the rest of your application's code
COPY . .

# Step 7: Final check (optional)
RUN ls -la

# The command to run the application
CMD ["node", "-e", "require('./services/scheduler').runJobSearchProcess()"]
