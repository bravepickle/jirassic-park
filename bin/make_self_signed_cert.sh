#!/bin/bash
# Create self-signed certificate based on .env file provided settings
# See references
#   * https://www.openssl.org/docs/man1.0.2/man1/openssl-req.html
#   * https://www.digicert.com/kb/ssl-support/openssl-quick-reference-guide.htm
#   * https://devcenter.heroku.com/articles/ssl-certificate-self

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

TARGET_DIR="${BASE_DIR}/var"

if [ ! -d $TARGET_DIR ]; then
    echo "Creating directory for SSL certs: ${TARGET_DIR}..."

    mkdir -p $TARGET_DIR
fi

cd $TARGET_DIR

echo "Processing SSL certs in folder ${TARGET_DIR}..."

if [[ "${APP_TLS_PASSPHRASE}" == "" ]]; then
    openssl req -newkey rsa:2048 \
                -x509 \
                -sha256 \
                -subj "/C=UA/ST=None/L=None/O=None/OU=root/CN=${APP_HOST}/emailAddress=support@${APP_HOST}" \
                -days 3650 \
                -nodes \
                -out ${TARGET_DIR}/server.crt \
                -keyout ${TARGET_DIR}/server.key
else
    openssl req -newkey rsa:2048 \
                -x509 \
                -sha256 \
                -subj "/C=UA/ST=None/L=None/O=None/OU=root/CN=${APP_HOST}/emailAddress=support@${APP_HOST}" \
                -days 3650 \
                -passout pass:"${APP_TLS_PASSPHRASE}" \
                -out ${TARGET_DIR}/server.crt \
                -keyout ${TARGET_DIR}/server.key
fi

# Make PEM file just in case it is needed
cat "${TARGET_DIR}/server.crt" "${TARGET_DIR}/server.key" | tee "server.pem"
