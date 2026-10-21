FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS theme-build

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
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.8.1@sha256:79c623a22abacf3fe6c00a5fb30f5b7843d717b234033b80995891c06116d244

COPY --from=keycloak-build /opt/keycloak/ /opt/keycloak/
