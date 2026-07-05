const { Readable, Writable } = require('node:stream');

const invokeExpress = ({ app, method = 'GET', url = '/', headers = {} }) => {
  return new Promise((resolve, reject) => {
    const chunks = [];

    const req = new Readable({
      read() {
        this.push(null);
      },
    });

    req.method = method;
    req.url = url;
    req.headers = headers;
    req.connection = { remoteAddress: '127.0.0.1' };
    req.socket = req.connection;
    req.httpVersion = '1.1';

    const response = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    const headersMap = {};

    response.statusCode = 200;
    response.locals = {};
    response.finished = false;

    response.setHeader = (name, value) => {
      headersMap[String(name).toLowerCase()] = value;
    };
    response.getHeader = (name) => headersMap[String(name).toLowerCase()];
    response.getHeaders = () => ({ ...headersMap });
    response.removeHeader = (name) => {
      delete headersMap[String(name).toLowerCase()];
    };
    response.flushHeaders = () => undefined;
    response.writeHead = (statusCode, reasonPhrase, extraHeaders) => {
      response.statusCode = statusCode;

      const resolvedHeaders =
        reasonPhrase && typeof reasonPhrase === 'object'
          ? reasonPhrase
          : extraHeaders;

      if (resolvedHeaders && typeof resolvedHeaders === 'object') {
        Object.entries(resolvedHeaders).forEach(([key, value]) => {
          response.setHeader(key, value);
        });
      }

      return response;
    };

    response.end = (chunk) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      response.finished = true;
      const bodyText = Buffer.concat(chunks).toString('utf8');

      let body = bodyText;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch (_error) {
        body = bodyText;
      }

      resolve({
        statusCode: response.statusCode,
        headers: { ...headersMap },
        bodyText,
        body,
      });

      return response;
    };

    response.on('error', reject);

    app.handle(req, response, (error) => {
      if (error) {
        reject(error);
        return;
      }

      if (!response.finished) {
        response.end();
      }
    });
  });
};

module.exports = {
  invokeExpress,
};
