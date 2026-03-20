FROM node:24.14.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG GITHUB_TOKEN
RUN GITHUB_TOKEN=$GITHUB_TOKEN npm run build
EXPOSE 5000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5000"]
