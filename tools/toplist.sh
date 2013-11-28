#!/usr/bin/env bash

NODE_ENV='production'
DEBUG='dbj:*'

cd ../
node tools/toplist.js
