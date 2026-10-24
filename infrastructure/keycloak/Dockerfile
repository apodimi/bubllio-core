FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS theme-build

WORKDIR /theme
RUN apk add --no-cache maven
COPY apps/keycloak-theme/package*.json ./
RUN npm ci
COPY apps/keycloak-theme ./
RUN npm run build:keycloak

FROM quay.io/keycloak/keycloak:26.8.1@sha256:79c623a22abacf3fe6c00a5fb30f5b7843d717b234033b80995891c06116d244 AS keycloak-build

ENV KC_DB=postgres
COPY --from=theme-build --chown=keycloak:keycloak \
    /theme/dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar \
    /opt/keycloak/providers/bubllio-theme.jar
RUN /opt/keycloak/bin/kc.sh build --vault=file

FROM quay.io/keycloak/keycloak:26.8.1@sha256:79c623a22abacf3fe6c00a5fb30f5b7843d717b234033b80995891c06116d244

ENV KC_VAULT=file \
    KC_VAULT_DIR=/opt/keycloak/vault
COPY --from=keycloak-build /opt/keycloak/ /opt/keycloak/
