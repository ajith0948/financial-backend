# Use official Node.js image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose the port your backend uses
EXPOSE 3000

# Start command
CMD ["npm", "start"]
