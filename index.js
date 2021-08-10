function evalIndex(code) {
  eval(code);
}

const path = require("path");
const fs = require('fs');
require("dotenv").config({ path: path.join(__dirname, "../.env") });
process.env.TETRIOCommitID = fs.readFileSync('./.TETRIOCommitID');

var app = require("express")();
var http = require("http").Server(app);

const Ribbon = require("./Objects/ribbon");
var socketio = require("socket.io")(http);
var sockets = [];
var logs = [];
var ribbon = new Ribbon(process.env.Token);

var ext = require("./ext")(Ribbon, socketio, ribbon, sockets, logs);
require("./Site/routes")(Ribbon, socketio, ribbon, sockets, logs, ext)(app);
require("./Site/socket")(Ribbon, socketio, ribbon, sockets, logs, ext, evalIndex)();

ext.Log("The Bot Client has started up", "GREEN", 1)

ribbon.defineExt(ext);
ribbon.connect()

//ext.Log("DO NOT PRESS THE STOP BUTTON ON REPL.IT, INSTEAD PRESS CTRL + C IN THE CONSOLE.", "RED", 1, false);
//ext.Log("DO NOT PRESS THE STOP BUTTON ON REPL.IT, INSTEAD PRESS CTRL + C IN THE CONSOLE.", "RED", 1, false);
//ext.Log("DO NOT PRESS THE STOP BUTTON ON REPL.IT, INSTEAD PRESS CTRL + C IN THE CONSOLE.", "RED", 1, false);

http.listen(8080, () => {
	ext.Log("Web Console Site Started", "GREEN", 1);
});

function exitHandler(exitCode) {
  console.log("")
	ext.Log("Shutting Down", "YELLOW", 1);
	ribbon.disconnectGracefully();
  ext.Log("Client has been shut down.", "RED", 1)
  process.exit(0);
}

if (false) {
  process.on("exit", exitHandler);
  process.on("SIGQUIT", exitHandler);
  process.on("SIGTERM", exitHandler);
  process.on("SIGINT", exitHandler);
  process.on("SIGWINCH", exitHandler);
  process.on("SIGUSR1", exitHandler);
  process.on("SIGABRT", exitHandler);
  process.on("uncaughtException", exitHandler);
}
_ = "";