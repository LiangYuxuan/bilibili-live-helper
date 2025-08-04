FROM node:22.18.0

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g corepack@latest && corepack enable && pnpm install

COPY src ./src
COPY tsconfig.json ./

CMD [ "pnpm", "start" ]
