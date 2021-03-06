'use strict';
var stream = require('stream');
var qs = require('querystring');
var parseurl = require('parseurl');
var _ = require('lodash');
var Requester = require('msb').Requester;
var helpers = require('../helpers');
var debug = {
  ack: require('debug')('http2bus:ack'),
  response: require('debug')('http2bus:response')
};

/*
  Returns a middleware that publishes incoming requests and responds where a response can be constructed.

  @param {object} config
  @param {object} config.bus
  @param {string} config.bus.namespace
  @param {number} [config.bus.responseTimeout=3000]
  @param {number} [config.bus.waitForResponses=-1] 0=return immediately, 1+=return after n, -1=wait until timeout
*/
module.exports = function(config) {
  return function(req, res, next) {
    var requester = new Requester(config.bus);

    var urlParts = parseurl(req);
    var request = {
      url: req.url,
      method: req.method,
      headers: req.headers,
      params: req.params,
      query: qs.parse(urlParts.query),
      body: null,
      bodyBuffer: null
    };

    if (req.body) {
      var textType = helpers.contentTypeIsText(req.headers['content-type'] || '');

      if (textType === 'json') {
        request.body = JSON.parse(req.body.toString());
      } else if (textType) {
        request.body = req.body.toString();
      } else {
        request.bodyBuffer = req.body.toString('base64');
      }
    }

    requester
    .publish(request)
    .once('error', next)
    .on('ack', debug.ack)
    .on('response', debug.response)
    .once('end', function() {
      if (!requester.responseMessages.length) {
        res.writeHead((config.bus.waitForResponses) ? 503 : 204);
        res.end();
        return;
      }

      var response = _.last(requester.responseMessages).payload;
      var body = response.body;
      var headers = _.omit(response.headers,
        'access-control-allow-origin',
        'access-control-allow-headers',
        'access-control-allow-methods',
        'access-control-allow-credentials');

      if (response.bodyBuffer) {
        body = new Buffer(response.bodyBuffer, 'base64');
      } else if (body && !_.isString(body)) {
        body = JSON.stringify(body);
      }

      var defaultHeaders = {
        'x-msb-correlation-id': requester.message.correlationId
      };

      if (!body) defaultHeaders['content-length'] = 0;

      res.writeHead(response.statusCode || 200, _.defaults(defaultHeaders, headers));
      res.end(body);
    });
  };
};
