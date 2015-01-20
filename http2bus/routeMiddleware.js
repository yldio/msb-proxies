'use strict';
var _ = require('lodash');
var Originator = require('msb').Originator;

/*
  Returns a middleware that publishes incoming requests and responds where a response can be constructed.

  @param {object} config
  @param {string} config.namespace
  @param {number} [config.contribTimeout=3000]
  @param {number} [config.waitForContribs=-1] 0=return immediately, 1+=return after n contribs, -1=wait until timeout
*/
module.exports = function(config) {
  return function(req, res, next) {
    var originator = new Originator(config.bus);

    _.merge(originator.message.req, {
      url: req.url,
      method: req.method,
      headers: req.headers,
      params: req.params,
      query: req.query,
      body: req.body
    });

    originator
    .publish()
    .once('error', next)
    .on('ack', console.log)
    .on('contrib', console.log)
    .once('end', function(message) {
      res.writeHead(message.res.statusCode, message.res.headers);

      var body = message.res.body;
      if (message.res.bodyEncoding === 'base64') {
        body = new Buffer(message.res.body, 'base64');
      } else if (message.res.bodyEncoding === 'json') {
        body = JSON.stringify(message.res.body);
      } else {
        body = message.res.body;
      }

      res.end(body || null);
    });
  };
};
