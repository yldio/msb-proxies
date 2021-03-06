/* Setup */
var Lab = require('lab');
var Code = require('code');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var after = lab.after;
var afterEach = lab.afterEach;
var expect = Code.expect;

/* Modules */
var simple = require('simple-mock');
var msb = require('msb');
var bus2http = require('../lib/bus2http');
var app = bus2http.app;
var router = bus2http.router;

describe('bus2http.app', function() {
  afterEach(function(done) {
    simple.restore();
    done();
  });

  describe('start()', function() {
    it('should configure for bus, load routes', function(done) {
      simple.mock(msb, 'configure').returnWith();
      simple.mock(msb.channelMonitorAgent, 'start').returnWith();
      simple.mock(router, 'load').returnWith();

      app.start();

      expect(msb.configure.called).true();
      expect(msb.configure.lastCall.args[0]).equals(bus2http.config.bus);
      expect(msb.channelMonitorAgent.start.called).true();
      expect(router.load.called).true();
      expect(router.load.lastCall.args[0]).equals(bus2http.config.routes);

      done();
    });
  });
});
