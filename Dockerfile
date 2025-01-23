FROM node:22.13.1

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && pnpm install

COPY src ./src
COPY tsconfig.json ./

CMD [ "pnpm", "start" ]
