var system = require('system');
var webpage = require('webpage');

var loginSettings = {
  url: "https://www.amazon.com/ap/signin",
  emailId: "ap_email",
  passwordId: "ap_password",
  formId: "ap_signin_form",
  username: system.args[1],
  password: system.args[2]
}

var api = {
  homepage: "http://read.amazon.com",
  ownedContent: "https://read.amazon.com/service/web/reader/getOwnedContent",
  startReading: "https://read.amazon.com/service/web/reader/startReading?clientVersion=10505419&asin="
}

var ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2";

function login(settings, callback) {
  var page = webpage.create();
  page.settings.userAgent = ua;

  page.onLoadFinished = function() {
    if(page.url.indexOf(settings.url) == 0) {
      page.evaluate(function(settings) {
        document.getElementById(settings.emailId).value = settings.username;
        document.getElementById(settings.passwordId).value = settings.password;
        document.getElementById(settings.formId).submit()
      }, settings)
    }
  }

  page.onResourceRequested = function(requestData) {
      system.stderr.writeLine("Requesting: " + requestData.url);
      if(requestData.url.indexOf(api.ownedContent) == 0) {
        page.close();

        var customHeaders = {};
        requestData.headers.forEach(function(h){ customHeaders[h.name] = h.value});
        callback(customHeaders);
      }
  }

  page.open(api.homepage)
}

login(loginSettings, function(headers) {
  var page = webpage.create();
  page.customHeaders = headers;

  function loadSyncData(asins, ownedContent, callback) {
    if(asins.length > 0) {
      var asin = asins.shift();
      system.stderr.writeLine("Loading: " + ownedContent[asin].title);

      page.open(api.startReading + asin, function() {
        ownedContent[asin].sync = JSON.parse(page.framePlainText);
        loadSyncData(asins, ownedContent, callback);
      })
    } else {
      callback();
    }
  }

  page.open(api.ownedContent, function() {
    var ownedContent = JSON.parse(page.framePlainText).asinsToAdd;
    var asins = Object.keys(ownedContent);
    loadSyncData(asins, ownedContent, function() {
      console.log(JSON.stringify(ownedContent));
      phantom.exit();
    });
  })
});
