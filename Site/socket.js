const os = require("os");

var Ribbon = undefined;
var socketio = undefined;
var ribbon = undefined;
var sockets = undefined;
var logs = undefined;
var ext = undefined;
var chathistory = [];

function SetSocket() {
  socketio.on("connection", (socket) => {
    socket.emit("auth", "");
    //ext.Log("A client has connected to SocketIO", "CYAN", 3)
    socket.on("auth", (auth) => {
      if (auth[1] == process.env.Pass) {
        socket.username = auth[0];
        sockets.push(socket);

        if (ribbon) socket.emit("ai", ribbon.aiStyle);
        logs.slice(-200).forEach(log => socket.emit("log", log));
        chathistory.slice(-100).forEach(chat => socket.emit("chat", chat));

        if (auth[2]) sockets.forEach(socket => socket.emit("chat", ["", `${auth[0]} has connected`]));
        chathistory.push(["", `${auth[0]} has connected`]);

        var curusers = [];
        sockets.forEach(othersocket => curusers.push(othersocket.username));
        if (auth[2]) socket.emit("users", curusers);

        socket.on("raw", (cmd) => {
          try {
            command = JSON.parse(cmd);
            switch (command.command) {
              case "shutdown":
                ext.Log("A client has commanded to shutdown", "RED", 1);
                ribbon.disconnectGracefully();
                process.exit(0);
                break;
              case "die":
                ext.Log("A client has commanded to die, reloading", "YELLOW", 2);
                try {ribbon.disconnectGracefully();} catch {}
                ribbon.cleanup();
                ribbon.connect();
              case "reboot":
                ext.Log("A client has commanded to reboot.", "YELLOW", 2);
                try {ribbon.disconnectGracefully();} catch {}
                ribbon = new Ribbon(process.env.Token, ext, "MAIN");
                ribbon.connect();
                break;
              case "clr":
                ext.clearLog();
                break;
              case "auto":
                try{ribbon/*?*/.room.autoStart(command.data);}catch{};
                break;
              case "ain":
                try{ribbon/*?*/.room.infNext = !ribbon/*?*/.room.infNext;}catch{};
                break;
              case "eval":
                eval(message.data.content.split(/ (.+)/)[1]);
                break;
              default:
                ribbon.sendMessage(command);
                break;
            }
          }
          catch {
            ext.Log("A client has sent an invalid command.", "YELLOW", 2);
          }
        });

        socket.on("chat", (msg) => {
          socket.username = msg[0];
          chathistory.push(msg);
          sockets.forEach(othersocket => othersocket.emit("chat", msg))
        });

        socket.on("name", (newname) => {
          sockets.forEach(othersocket => othersocket.emit("chat", ["", `${socket.username} has renamed to ${newname}`]));
          chathistory.push(["", `${socket.username} has renamed to ${newname}`]);
          socket.username = newname;
        });

        socket.on("cons", () => {
          var curusers = [];
          sockets.forEach(othersocket => curusers.push(othersocket.username)); 
          socket.emit("users", curusers);
        });

        socket.on("ai", (ai) => {
          sockets.forEach(socket => socket.emit("ai", ai));
          ribbon.aiStyle = ai;
        });
        //ext.Log("A client has authed to SocketIO", "GREEN", 3);
      }
      else {
        ext.Log("A client failed to auth to SocketIO", "YELLOW", 2);
      }

      socket.on("disconnect", () => {
        sockets.splice(sockets.indexOf(socket), 1);
        sockets.forEach(othersocket => othersocket.emit("chat", ["", `${socket.username} has disconnected`]));
        chathistory.push(["", `${socket.username} has disconnected`]);
      })

      socket.on("error", () => {
        sockets.splice(sockets.indexOf(socket), 1);
        sockets.forEach(othersocket => othersocket.emit("chat", ["", `${socket.username} has disconnected`]));
        chathistory.push(["", `${socket.username} has disconnected`]);
      })
    });
  });
}

function init(tRibbon, tsocketio, tribbon, tsockets, tlogs, text) {
  Ribbon = tRibbon;
  socketio = tsocketio;
  ribbon = tribbon;
  sockets = tsockets;
  logs = tlogs;
  ext = text;
  return SetSocket;
}

module.exports = init;