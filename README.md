# Whistler


### Gernerate SSL Certificate

```
# Run this command under ./envoy/keys directory
openssl req -newkey rsa:2048 -x509 -nodes -keyout server.key -new -out server.crt -config req.cnf -sha256 -days 3650
```

### Import certificate into the browser

Download `server.cer` and import it into the browser as `Trusted Root Certification Authorities`
