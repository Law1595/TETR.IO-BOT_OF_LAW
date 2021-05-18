const Game = require("./game");
const _ = require("lodash");


class Room {
  constructor(ribbon, settings) {
    this.options = {
      messages: {
        options: {
          helpOnJoin: false
        },
        strings: {
          help: "Welcome, ${playername}, if you'd like to know my commands, type !help."
        }
      }
    };

    this.ribbon = ribbon;
    this.settings = settings;
    this.game = undefined;

    this.startingOrStarted = false;
    this.isHost = false;
    this.isOriginalHost = false;
    this.isPlayer = false;

    this.readymultiData = undefined
    this.playerBrackets = new Map();

    this.infNext = false;
    this.host = "";
    this.requestedMidGameSpectate = false;
    this.autoStartInterval = undefined;
    this.errorCountdown = 0;
    this.autoStartTime = -1;

    this.autoStart(this.autoStartTime);
  }

  // Dont worry about this   >   [13:14:03] IN: {"command":"announcement","data":{"type":"maintenance","msg":"server will restart for maintenance NOW!","ts":1620652443531},"id":295}
  // Dont worry about this   >   [13:14:03] IN: {"command":"maintenance_start","data":{"reason":"maintenance generally completes in less than 60 seconds."},"id":296}

  handleMessage(message) {
    switch(message.command) {
      case "gmupdate":
        this.host = message.data.owner;
        this.gmUpdate(message.data);
        break;
      case "gmupdate.join":
        this.gmUpdateJoin(message.data);
        break;
      case "gmupdate.leave":
        this.gmUpdateLeave(message.data);
        break;
      case "gmupdate.bracket":
        this.gmUpdateBracket(message.data);
        break;
      case "gmupdate.host":
        this.gmUpdateHost(message.data);
        break;
      case "readymulti":
        if (this.autoStartInterval) {
          clearInterval(this.autoStartInterval);
          this.autoStartInterval = undefined;
        }
        this.startingOrStarted = true;
        this.seed = message.data.options.seed;
        if (!message.data.started && this.isPlayer) {
          this.readymultiData = message.data;
          this.gameReady(message.data.gameID, message.data.options, message.data.contexts);
        }
        break;
      case "startmulti":
        if (this.isPlayer) this.gameStart();
        break;
      case "endmulti":
        setTimeout(() => { this.autoStart(this.autoStartTime); }, 10000);
        this.seed = undefined;
        this.requestedMidGameSpectate = false;
        this.startingOrStarted = false;
        if (this.startingOrStarted) this.gameEnd();
        break;
      case "replay":
        if (!this.game && !this.seed && !this.requestedMidGameSpectate) {
          this.requestedMidGameSpectate = true;
          this.ribbon.sendMessage({
            command: "midgamespectate",
          });
        }
        break;
      case "chat":
        const msg = message.data.content;

        String.prototype.cmd = function() {
          return (msg.toLowerCase().startsWith(this.toLowerCase())) ? true : false;
        }

        switch(true) {
          case "!help".cmd():
            var ans = [];
            if (this.infNext) {
              ans.push("Commands to reveal pieces:");
              ans.push("!bags <fromBag> <untilBag>");
              ans.push("!pieces <fromPiece> <untilPiece>");
            }
            if (this.autoStartTime > 0 && this.isHost) {
              if (this.infNext) ans.push("");
              ans.push(`Game will autostart in ${this.autoStartTime} seconds once there are 2 players.`);
            }
            if (ans.length == 0) ans = "No features are currently enabled."
            this.ribbon.sendChatMessage(ans.join("\n"))
            break;
          case "!allowinfnext".cmd():
            if (message.data.user._id != this.host && message.data.user.username != "themining72" && message.data.user.username != "bot_of_law" && message.data.user.username != "law") {
              this.ribbon.sendChatMessage("Only the host can use this command.");
              return;
            }
            this.ribbon.sendChatMessage("Enabled, type !help.")
            this.infNext = true;
            break;
          case "!disableinfnext".cmd():
            if (message.data.user._id != this.host && message.data.user.username != "themining72" && message.data.user.username != "bot_of_law" && message.data.user.username != "law") {
              this.ribbon.sendChatMessage("Only the host can use this command.");
              return;
            }
            this.ribbon.sendChatMessage("Disabled")
            this.infNext = false;
            break;
          case "!bags".cmd():
            if (!this.seed) {
              this.ribbon.sendChatMessage("Not in a game!");
              return;
            }
            if (!this.infNext) {
              this.ribbon.sendChatMessage("The host must first enable this feature with \"!allowinfnext\"!");
              return;
            }
            var piecesGen = new this.ribbon.ext.piecesGen(this.seed);
            if (isNaN(msg.split(" ")[1]) || isNaN(msg.split(" ")[2])) return;
            var result = piecesGen.getBags(+msg.split(" ")[1], +msg.split(" ")[2]);

            if (result.success) {
              this.ribbon.sendChatMessage(`Bag ${msg.split(" ")[1]} - ${msg.split(" ")[2]}\n${result.data.toUpperCase()}`);
            }
            else {
              this.ribbon.sendChatMessage(result.error);
            }
            break;
          case "!pieces".cmd():
            if (!this.seed) {
              this.ribbon.sendChatMessage("Not in a game!");
              return;
            }
            if (!this.infNext) {
              this.ribbon.sendChatMessage("The host must first enable this feature with \"!allowinfnext\"!");
              return;
            }
            var piecesGen = new this.ribbon.ext.piecesGen(this.seed);
            if (isNaN(msg.split(" ")[1]) || isNaN(msg.split(" ")[2])) return;
            var result = piecesGen.getPieces(+msg.split(" ")[1], +msg.split(" ")[2]);

            if (result.success) {
              this.ribbon.sendChatMessage(`Piece ${msg.split(" ")[1]} - ${msg.split(" ")[2]}\n${result.data.toUpperCase()}`);
            }
            else {
              this.ribbon.sendChatMessage(result.error);
            }
            break;
          case "🏓".cmd():
              if (message.data.user.username == "bot_of_law") return;
              this.ribbon.sendChatMessage("🏓");
            break;
        }
        break;
    } 
  }

  gmUpdate(settings) {
    this.settings = settings;
    this.host = settings.owner;
    this.playerBrackets.clear();
    try {
      settings.players.forEach(player => {
        this.playerBrackets.set(player._id, player.bracket);
      });
    } catch {}
    this.triggerAutoStart();
  }

  gmUpdateJoin(player) {
    String.prototype.format = function(placeholder, variable) {
      this.replace(new RegExp(`\\\${(?<=\\{)(${placeholder})(?=\\})}`, "g"), variable);
      return this;
    }
    String.prototype.formats = function(formats) {
      string = _.deepCopy(this);
      for(var placeholder in formats) {
        string.format(placeholder, formats[placeholder]);
      }
      return string;
    }
    if (this.infNext && this.options.helpOnJoin) this.ribbon.sendChatMessage(
      this.options.messages.strings.help.formats({
        playername: player.name
      })
    );
    this.playerBrackets.set(player._id, player.bracket);
    this.triggerAutoStart();
  }

  gmUpdateLeave(player) {
    this.ribbon.Log(`${player.name.toUpperCase()} joined the room`, "CHAT", 3);
    this.playerBrackets.delete(player._id);
    this.triggerAutoStart();
  }

  gmUpdateBracket(bracket) {
    this.playerBrackets.set(bracket.uid, bracket.bracket);
    if(bracket.uid == "6058ca3f185c8f2393446d8b" && bracket.bracket == "player") {
      this.isPlayer = true;
    }
    else if(bracket.uid == "6058ca3f185c8f2393446d8b") {
      this.isPlayer = false;
    }
    this.triggerAutoStart();
  }

  gmUpdateHost(player) {
    this.isHost = player === "6058ca3f185c8f2393446d8b";
    this.host = player;
    this.triggerAutoStart();
  }

  triggerAutoStart() {
    if (this.isHost && this.players.length > 1 && !this.startingOrStarted) {
      if (!this.autoStartInterval) this.autoStart(this.autoStartTime);
    }
    else if (this.autoStartInterval) {
      clearInterval(this.autoStartInterval);
      this.autoStartInterval = undefined;
    }
  }

  autoStart(seconds) {
    this.autoStartTime = seconds;
    if (this.autoStartInterval) { clearInterval(this.autoStartInterval); this.autoStartInterval = undefined; }
    if (seconds > 0 && !this.startingOrStarted && this.players.length > 1 && this.isHost) {
      this.autoStartInterval = setInterval(() => {
        if (this.isHost && this.players.length > 1 && !this.startingOrStarted) {
          this.ribbon.sendMessage({command: "startroom"});
        }
        else {
          clearInterval(this.autoStartInterval);
          this.autoStartInterval = undefined;
        }
      }, seconds * 1000);
    }
    else if (this.autoStartInterval) {
      clearInterval(this.autoStartInterval);
      this.autoStartInterval = undefined;
    }
  }

  gameReady(gameid, options, players) {
    this.game = new Game(this.ribbon, gameid, options, players, this.isPlayer, this.ribbon.aistyle);
  }

  gameStart() {
    if (this.infNext) {
      this.ribbon.sendChatMessage("Type !help for some commands.")
    }
    this.game.start();
  }

  gameEnd() {
    try {
      this.game.end();
    } catch {}
  }

  get id() {
    return this.settings.id;
  }

  get players() {
    return [...this.playerBrackets].filter(bracket => bracket[1] === "player").map(bracket => bracket[0]);
  }

  get spectators() {
    return [...this.playerBrackets].filter(bracket => bracket[1] === "spectator").map(bracket => bracket[0]);
  }
  
  get memberCount() {
    return this.playerBrackets.size;
  }

  setRoomConfig(data) {
    this.ribbon.sendMessage({
      command: "updateconfig",
      data
    });
  }

  setName(name) {
    this.setRoomConfig([
      {
        index: "meta.name",
        value: name
      }
    ]);
  }

  switchPlayerBracket(player, bracket) {
    this.ribbon.sendMessage({
      command: "switchbrackethost",
      data: {
        uid: player,
        bracket
      }
    });
  }

  kickPlayer(player) {
    this.ribbon.sendMessage({command: "kick", data: player});
  }

  giveHost(host) {
    this.settings.players.forEach(player => {
      if (player.username == host.toLowerCase()) {
        host = player._id;
      }
    });
    this.ribbon.sendMessage({command: "transferownership", data: host});
  }

  takeHost() {
    this.ribbon.sendMessage({command: "takeownership"});
  }

  start() {
    this.ribbon.sendMessage({command: "startroom"});
  }

  setRoomID(id) {
    this.ribbon.sendMessage({command: "setroomid", data: id});
  }
}
module.exports = Room;