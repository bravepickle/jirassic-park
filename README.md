# jirassic-park
Visualize task relations

# Install
1. Install Docker & Docker Compose
2. Init `.env` & `.env.app` according to your expectations and examples
3. Run `bin/build_templates.sh` to create necessary templates. 
4. Run `bin/make_self_signed.cert` to create self-signed certificats, if needed. You can generate them any way you want
3. Run `docker compose build` to build containers
4. Run `docker up` to run containers
5. Add `127.0.0.1 jirassic.localhost` or similar to `/etc/hosts` on host machine
6. Go to https://localhost:9443/app/ or https://jirassic.localhost:9443/app/ to start working with the app or directly go to https://localhost:8443/app/ to avoid proxy (not recommended)

# Example
```shell
$ curl -I http://localhost:8000/
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Tue, 03 Oct 2023 21:58:03 GMT
Content-Length: 27
```

```shell
curl --insecure https://jirassic.localhost:9443/jira/rest/api/2/issue/TEST-234 -u $AUTH_USER:$AUTH_TOKEN -H 'Content-Type: application/json' -H 'Accept: application/json'
```

# Troubleshooting
* use proxy instead of directly going to app container. Will save troubles with TLS, configs, CORS etc.
* if using proxy then .env.app should be configured without TLS and 443 port

# TODO
- [ ] use TLS
- [ ] helper to generate self-signed TLS certs
- [ ] fix CORS problem or use OAuth
