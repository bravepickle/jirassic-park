#!/bin/bash
# Build templates

set -e

BASE_DIR="$( dirname $( cd "$( dirname "$(realpath $BASH_SOURCE)" )" && pwd ))"

if [ ! -f $BASE_DIR/.env.app ]; then
    echo ".env.app not file at path: ${BASE_DIR}"

    exit 1
fi

# automatically export all variables from .env file
set -a
source $BASE_DIR/.env.app
set +a

echo BASE_DIR $BASE_DIR

echo Creating file: etc/traefik/dynamic.conf.yaml
sed 's~${APP_JIRA_BASE_URI}~'${APP_JIRA_BASE_URI}'~g' etc/traefik/dynamic.conf.tpl.yaml > etc/traefik/dynamic.conf.yaml
