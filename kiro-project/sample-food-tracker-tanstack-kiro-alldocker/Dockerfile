FROM node:20-alpine

RUN apk add --no-cache libc6-compat

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
