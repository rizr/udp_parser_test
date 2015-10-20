var dgram = require("dgram");
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var server = dgram.createSocket("udp4");
var serversCount = process.env.SRV_COUNT || 1;
var servers = [];
var serverMsgStatus = new Array(serversCount);
var ip = process.env.IP || '127.0.0.1';

for (var k = 0; k <= serversCount; k++) {
    serverMsgStatus[k] = new Array(5);
}

for (var i = 0; i < serversCount; i++) {
    servers[i] = dgram.createSocket("udp4");
    servers[i].bind(41000 + i, ip);
}
servers.forEach(function (elem, i, servers) {
    servers[i].on("error", function (err) {
        console.log("server error:\n" + err.stack);
        server.close();
    });

    servers[i].on("message", function (msg, rinfo) {
        console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port + '\n');

        if (!serverMsgStatus[i][0])
            serverMsgStatus[i][0] = msg.toString().match(/^FXO: Start CNDD$/g);
        if (!serverMsgStatus[i][1])
            serverMsgStatus[i][1] = msg.toString().match(/ID:#\d+/g) ? msg.toString().match(/ID:#\d+/g).toString().match(/\d+/g).toString() : msg.toString().match(/ID:#\d+/g);
        if (!serverMsgStatus[i][2])
            serverMsgStatus[i][2] = msg.toString().match(/Phone=(\d+)/g) ? msg.toString().match(/Phone=(\d+)/g).toString().match(/\d+/g).toString() : msg.toString().match(/Phone=(\d+)/g);

        if (serverMsgStatus[i][0] && serverMsgStatus[i][1] && serverMsgStatus[i][2]) {
            console.log("CALLING: " + 'http://someserver.com/' + serverMsgStatus[i][1] + '/' + serverMsgStatus[i][2]);
            request({
                uri: 'http://someserver.com/' + serverMsgStatus[i][1] + '/' + serverMsgStatus[i][2],
                method: 'GET'
            })
                .spread(function (response, body) {
                    serverMsgStatus[i][3] = serverMsgStatus[i][1];
                    serverMsgStatus[i][4] = serverMsgStatus[i][2];
                    serverMsgStatus[i][0] = false;
                    serverMsgStatus[i][1] = false;
                    serverMsgStatus[i][2] = false;
                  //  console.log('Status:', response.statusCode);
                  //  console.log('Headers:', JSON.stringify(response.headers));
                  //  console.log('Response:', body)
                }).catch(function (err) {
                    console.error(err);
                });
        }

        if (msg.toString().match(/^Stop PSTN Tone$/g)) {
            console.log("Stop: " + 'http://someserver.com/' + serverMsgStatus[i][3] + '/hangup/' + serverMsgStatus[i][4]);
            request({
                uri: 'http://someserver.com/' + serverMsgStatus[i][3] + '/hangup/' + serverMsgStatus[i][4],
                method: 'GET'
            })
                .spread(function (response, body) {
                    serverMsgStatus[i][3] = false;
                    serverMsgStatus[i][4] = false;
                   // console.log('Status:', response.statusCode);
                   // console.log('Headers:', JSON.stringify(response.headers));
                   // console.log('Response:', body)
                }).catch(function (err) {
                    console.error(err);
                });
        }
    });

    servers[i].on("listening", function () {
        var address = servers[i].address();
        console.log("server listening " +
        address.address + ":" + address.port);
    });
});
//test
var client = dgram.createSocket("udp4");
var buf = 'test string sadasdsa';
var buf2 = 'FXO: Start CNDD';
var noise = 'te212st  323  string sadasdsa';
var buf3 = 'CNDD Name= Phone=0401210172';
var buf4 = 'Caller ID:#012--';
client.send(buf, 0, buf.length, 41000, ip);
client.send(buf2, 0, buf2.length, 41000, ip);
client.send(noise, 0, noise.length, 41000, ip);
client.send(buf3, 0, buf3.length, 41000, ip);
client.send(buf4, 0, buf4.length, 41000, ip);