FROM node:20-alpine
RUN apk add --no-cache openssl
EXPOSE 3458
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3458
ENV RESEND_API_KEY=re_NUBTcPXk_A17SNBnfFvLE984cU1Zm6oVR
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN npm run build
CMD ["npm", "run", "docker-start"]