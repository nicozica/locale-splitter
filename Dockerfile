FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

USER node

EXPOSE 3000

CMD ["npm", "start"]
