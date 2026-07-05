FROM node:18

WORKDIR /usr/src/komunicare-api

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

RUN npm install -g pnpm@9 \
  && pnpm install --frozen-lockfile

COPY . .

RUN npm run build

EXPOSE 10010

CMD ["node", "dist/app.js"]
