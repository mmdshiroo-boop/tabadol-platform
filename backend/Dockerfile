# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5001

# Start the server
CMD ["npm", "start"]