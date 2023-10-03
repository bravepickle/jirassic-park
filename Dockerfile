FROM golang:1-alpine3.17


# default basic auth credentials
ARG AUTH_USER
ARG AUTH_PASS

# JIRA base URI. E.g. https://jira.atlassian.com/rest/api/2/
ARG JIRA_BASE_URI

ENV APP_AUTH_USER $AUTH_USER
ENV APP_AUTH_PASS $AUTH_PASS
ENV APP_JIRA_BASE_URI $JIRA_BASE_URI

WORKDIR /app

COPY .env.app /app/.env
COPY *.go /app/
COPY ./var/ /app/var
COPY ./vendor /app/vendor

# RUN apk add --no-cache

VOLUME /app
