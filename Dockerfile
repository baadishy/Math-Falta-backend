FROM node:18-alpine

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json* ./
RUN npm install --production --silent

# Copy app source
COPY . ./

ENV NODE_ENV=production

# Render will set PORT environment variable; default to 3000 in code
EXPOSE 3000

CMD ["npm", "start"]
