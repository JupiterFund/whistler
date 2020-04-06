#!/bin/bash

openssl req \
        -newkey rsa:2048 -x509 -nodes -keyout server.key \
        -new -out server.crt \
        -config req.cnf -sha256 -days 3650
