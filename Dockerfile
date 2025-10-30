# 1. Use an official Node.js image
FROM node:20

# 2. Set working directory
WORKDIR /usr/src/app

# 3. Copy package files first
COPY package*.json ./

# 4. Install dependencies
RUN npm install --production

# 5. Copy the rest of your project
COPY . .

# 6. Expose the port
EXPOSE 3000

# 7. Start your app
CMD ["npm", "start"]
