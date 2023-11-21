# Build app
FROM golang:1-alpine3.17 AS go-app

WORKDIR /app

COPY . /app
RUN go mod vendor \
    && go build -o jirassic-park

# =========
# init image
FROM alpine:3.17

# default basic auth credentials
ARG AUTH_USER
ARG AUTH_PASS

# JIRA base URI. E.g. https://jira.atlassian.com/rest/api/2/
ARG JIRA_BASE_URI

ENV APP_AUTH_USER $AUTH_USER
ENV APP_AUTH_PASS $AUTH_PASS
ENV APP_JIRA_BASE_URI $JIRA_BASE_URI

WORKDIR /app

COPY --from=go-app /app/.env.app.example /app/.env
COPY --from=go-app /app/view /app/view
COPY --from=go-app /app/var/server.* /app/var/
COPY --from=go-app /app/jirassic-park /app/jirassic-park

# RUN apk add --no-cache

VOLUME /app

EXPOSE 80
EXPOSE 443

CMD [ "jirassic-park", "--env .env", "--debug"]
