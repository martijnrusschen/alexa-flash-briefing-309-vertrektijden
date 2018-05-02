'use strict';
const request = require("request");
require("babel-polyfill");

module.exports.feed = (event, context, callback) => {
  var payload = '';
  const now = new Date();
  const options = {
    url: "https://api.vertrektijd.info/departures/_nametown/Assen/M.L.%20Kingweg/",
    headers: { 'X-Vertrektijd-Client-Api-Key': process.env.OV_VERTREKTIJDEN_API }
  };

  function diff_minutes(dt2, dt1) {
    var diff =(dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60;
    return Math.abs(Math.round(diff));
  }

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body)

      if (json === undefined) {
        return;
      }

      var station = Object.entries(json)[1]

      station.forEach(function(stationType) {
        if (stationType === 'BTMF') {
          return;
        }

        var busStation = stationType;

        busStation.forEach(function(perron) {
          Object.entries(perron).forEach(function(line) {
            line.forEach(function(bus) {
              if (bus === 'Station_Info') {
                return;
              }

              if (bus[1] === undefined || bus[1] === 'e') {
                return;
              }

              var nextDepartures = []

              bus.forEach(function(leavingBus) {
                if (leavingBus['LineNumber'] === '309' && leavingBus['Destination'] === 'Groningen HS') {
                  var departure = new Date(leavingBus['ExpectedDeparture'])
                  var diff = diff_minutes(departure, now)

                  // We need to substract 60 minutes because of time zone differences
                  // We need to substract 120 minutes because of DST
                  var normalized_diff = diff - 120

                  nextDepartures.push(normalized_diff)
                }
              });

              if (nextDepartures.length < 1) {
                return;
              }

              var firstBusTime = nextDepartures[0];
              var secondBusTime = nextDepartures[1];
              var thirdBusTime = nextDepartures[2];

              var firstBus = 'The next bus to Groningen is leaving in ' + firstBusTime + ' minutes.'
              var extraBusses = ''

              if (secondBusTime !== undefined) {
                extraBusses = ' After that the following bus is leaving in ' + secondBusTime + ' minutes'
              }

              if (!thirdBusTime !== undefined) {
                extraBusses = ' After that the following busses are leaving in ' +  secondBusTime + ' and ' + thirdBusTime + ' minutes.'
              }

              body = firstBus + extraBusses
            });
          });
        });
      });

      const responseData = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        },
        body: JSON.stringify({
          titleText: '309 Vertrektijden',
          mainText: body,
          redirectionUrl: 'https://qbuzz.nl',
          updateDate: now,
          uid: now,
        }),
      };

      callback(null, responseData);
    };
  });
};
