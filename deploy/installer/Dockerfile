FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS runtime

WORKDIR /opt/bubllio

RUN mkdir -p /input /state

COPY deploy/contract ./deploy/contract
COPY deploy/release ./deploy/release
COPY scripts/bubllio-installer.mjs scripts/create-installation-contract.mjs scripts/prepare-installation.mjs ./scripts/

USER node

ENTRYPOINT ["node", "/opt/bubllio/scripts/bubllio-installer.mjs"]
