# oip-express

oip-express is a simple webapp boilerplate using expressjs, pug, and js-oip to build a single-page FLO webapp.

## Install
```
npm install
```

## Building
Call the babel binary directly to compile js to the lib directory:
```
./node_modules/.bin/babel src --out-dir lib
```
or, use our builtin custom package script:
```
npm run compile
```

## Running
After compiling with babel, start the webserver:
```
npm start
```

For convenience, run both commands in sequence:
```
npm run compile && npm start
```

## Configuration
Configuration is done through modifying `src/index.js` at the moment. In the future a configuration file is planned. 
```
port = 3000
oip-server = snowflake.oip.fun
```
