FROM node:24-alpine AS base
# Refuse to build on a Node release missing the 21 Oct 2026 security fixes
# (CVE-2026-111497 Brotli, CVE-2026-105482 DNS, TLS IP-identity CVEs).
RUN node -e "const m={22:[23,4],24:[22,1],26:[12,1]};const [a,b,c]=process.versions.node.split('.').map(Number);const f=m[a];if(a>26||(f&&(b>f[0]||(b===f[0]&&c>=f[1]))))process.exit(0);console.error('Node '+process.version+' is vulnerable; need >=22.23.4, >=24.22.1 or >=26.12.1');process.exit(1)"

FROM base AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM base AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

FROM base AS build-env
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

FROM base
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY --from=build-env /app/public /app/public
WORKDIR /app
ENV NODE_ENV=production
CMD ["npm", "run", "start"]