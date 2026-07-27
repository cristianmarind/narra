FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the project
COPY . .

# Expo web dev server port
EXPOSE 8081

# Start Expo in web mode
CMD ["npx", "expo", "start", "--web", "--host", "lan"]
