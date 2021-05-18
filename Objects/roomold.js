const Game = require("./game");
const _ = require("lodash");


class Room {
  constructor(ribbon, settings) {
    this.self = new Proxy(this, {
      get: (target, prop, receiver) => {
        return Reflect.get(target, prop, receiver);
      },
      set: (obj, prop, newval) => {
        obj[prop] = newval;
        return true;
      }
    });

    this.self.options = {
      messages: {
        options: {
          helpOnJoin: false
        },
        strings: {
          help: "Welcome, ${playername}, if you'd like to know my commands, type !help."
        }
      }
    };

    this.self.ribbon = ribbon;
    this.self.settings = settings;
    this.self.game = undefined;

    this.self.startingOrStarted = false;
    this.self.isHost = false;
    this.self.isOriginalHost = false;
    this.self.isPlayer = false;

    this.self.readymultiData = undefined
    this.self.playerBrackets = new Map();

    this.self.infNext = false;
    this.self.host = "";
    this.self.requestedMidGameSpectate = false;
    this.self.autoStartInterval = undefined;
    this.self.errorCountdown = 0;
    this.self.autoStartTime = -1;

    // Dont worry about this   >   [13:14:03] IN: {"command":"announcement","data":{"type":"maintenance","msg":"server will restart for maintenance NOW!","ts":1620652443531},"id":295}
    // Dont worry about this   >   [13:14:03] IN: {"command":"maintenance_start","data":{"reason":"maintenance generally completes in less than 60 seconds."},"id":296}
    
    this.handleMessage = (message) => {
      switch(message.command) {
        case "gmupdate":
          this.self.host = message.data.owner;
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
          if (this.self.autoStartInterval) {
            clearInterval(this.self.autoStartInterval);
            this.self.autoStartInterval = undefined;
          }
          this.self.startingOrStarted = true;
          this.self.seed = message.data.options.seed;
          if (!message.data.started && this.self.isPlayer) {
            this.self.readymultiData = message.data;
            this.gameReady(message.data.gameID, message.data.options, message.data.contexts);
          }
          break;
        case "startmulti":
          if (this.self.isPlayer) this.gameStart();
          break;
        case "endmulti":
          setTimeout(() => { this.autoStartTime(this.self.autoStartTime); }, 10000);
          this.self.seed = undefined;
          this.self.requestedMidGameSpectate = false;
          this.self.startingOrStarted = false;
          if (this.self.startingOrStarted) this.gameEnd();
          break;
        case "replay":
          if (!this.self.game && !this.self.seed && !this.self.requestedMidGameSpectate) {
            this.self.requestedMidGameSpectate = true;
            this.self.ribbon.sendMessage({
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
              if (this.self.infNext) {
                ans.push("Commands to reveal pieces:");
                ans.push("!bags <fromBag> <untilBag>");
                ans.push("!pieces <fromPiece> <untilPiece>");
              }
              if (this.self.autoStartTime > 0 && this.self.isHost) {
                if (this.self.infNext) ans.push("");
                ans.push(`Game will autostart in ${this.self.autoStartTime} seconds once there are 2 players.`);
              }
              if (ans.length == 0) ans = "No features are currently enabled."
              this.self.ribbon.sendChatMessage(ans.join("\n"))
              break;
            case "!allowinfnext".cmd():
              if (message.data.user._id != this.self.host && message.data.user.username != "themining72" && message.data.user.username != "bot_of_law" && message.data.user.username != "law") {
                this.self.ribbon.sendChatMessage("Only the host can use this command.");
                return;
              }
              this.self.ribbon.sendChatMessage("Enabled, type !help.")
              this.self.infNext = true;
              break;
            case "!disableinfnext".cmd():
              if (message.data.user._id != this.self.host && message.data.user.username != "themining72" && message.data.user.username != "bot_of_law" && message.data.user.username != "law") {
                this.self.ribbon.sendChatMessage("Only the host can use this command.");
                return;
              }
              this.self.ribbon.sendChatMessage("Disabled")
              this.self.infNext = false;
              break;
            case "!bags".cmd():
              if (!this.self.seed) {
                this.self.ribbon.sendChatMessage("Not in a game!");
                return;
              }
              if (!this.self.infNext) {
                this.self.ribbon.sendChatMessage("The host must first enable this feature with \"!allowinfnext\"!");
                return;
              }
              var piecesGen = new this.self.ribbon.ext.piecesGen(this.self.seed);
              if (isNaN(msg.split(" ")[1]) || isNaN(msg.split(" ")[2])) return;
              var result = piecesGen.getBags(+msg.split(" ")[1], +msg.split(" ")[2]);
            
              if (result.success) {
                this.self.ribbon.sendChatMessage(`Bag ${msg.split(" ")[1]} - ${msg.split(" ")[2]}\n${result.data.toUpperCase()}`);
              }
              else {
                this.self.ribbon.sendChatMessage(result.error);
              }
              break;
            case "!pieces".cmd():
              if (!this.self.seed) {
                this.self.ribbon.sendChatMessage("Not in a game!");
                return;
              }
              if (!this.self.infNext) {
                this.self.ribbon.sendChatMessage("The host must first enable this feature with \"!allowinfnext\"!");
                return;
              }
              var piecesGen = new this.self.ribbon.ext.piecesGen(this.self.seed);
              if (isNaN(msg.split(" ")[1]) || isNaN(msg.split(" ")[2])) return;
              var result = piecesGen.getPieces(+msg.split(" ")[1], +msg.split(" ")[2]);
            
              if (result.success) {
                this.self.ribbon.sendChatMessage(`Piece ${msg.split(" ")[1]} - ${msg.split(" ")[2]}\n${result.data.toUpperCase()}`);
              }
              else {
                this.self.ribbon.sendChatMessage(result.error);
              }
              break;
            case "🏓".cmd():
                if (message.data.user.username == "bot_of_law") return;
                this.self.ribbon.sendChatMessage("🏓");
              break;
          }
          break;
      }
    
      this.gmUpdate = (settings) => {
        this.self.settings = settings;
        this.self.host = settings.owner;
        this.self.playerBrackets.clear();
        try {
          settings.players().forEach(player => {
            this.self.playerBrackets.set(player._id, player.bracket);
          });
        } catch {}
        this.triggerAutoStart();
      }
    
      this.gmUpdateJoin = (player) => {
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
        if (this.self.infNext && this.self.options.helpOnJoin) this.self.ribbon.sendChatMessage(
          this.self.options.messages.strings.help.formats({
            playername: player.name
          })
        );
        this.self.playerBrackets.set(player._id, player.bracket);
        this.triggerAutoStart();
      }
    
      this.gmUpdateLeave = (player) => {
        this.self.ribbon.Log(`${player.name.toUpperCase()} joined the room`, "CHAT", 3);
        this.self.playerBrackets.delete(player._id);
        this.triggerAutoStart();
      }
    
      this.gmUpdateBracket = (bracket) => {
        this.self.playerBrackets.set(bracket.uid, bracket.bracket);
        if(bracket.uid == "6058ca3f185c8f2393446d8b" && bracket.bracket == "player") {
          this.self.isPlayer = true;
        }
        else if(bracket.uid == "6058ca3f185c8f2393446d8b") {
          this.self.isPlayer = false;
        }
        this.triggerAutoStart();
      }
    
      this.gmUpdateHost = (player) => {
        this.self.isHost = player === "6058ca3f185c8f2393446d8b";
        this.self.host = player;
        this.triggerAutoStart();
      }
    
      this.triggerAutoStart = () => {
        if (this.self.isHost && this.players().length > 1 && !this.self.startingOrStarted) {
          if (!this.self.autoStartInterval) this.autoStart(this.self.autoStartTime);
        }
        else if (this.self.autoStartInterval) {
          clearInterval(this.self.autoStartInterval);
          this.self.autoStartInterval = undefined;
        }
      }
    
      this.autoStart = (seconds) => {
        this.self.autoStartTime = seconds;
        if (this.self.autoStartInterval) { clearInterval(this.self.autoStartInterval); this.self.autoStartInterval = undefined; }
        if (seconds > 0 && !this.self.startingOrStarted && this.players().length > 1 && this.self.isHost) {
          this.self.autoStartInterval = setInterval(() => {
            if (this.self.isHost && this.players().length > 1 && !this.self.startingOrStarted) {
              this.self.ribbon.sendMessage({command: "startroom"});
            }
            else {
              clearInterval(this.self.autoStartInterval);
              this.self.autoStartInterval = undefined;
            }
          }, seconds * 1000);
        }
        else if (this.self.autoStartInterval) {
          clearInterval(this.self.autoStartInterval);
          this.self.autoStartInterval = undefined;
        }
      }
    
      this.gameReady = (gameid, options, players) => {
        this.self.game = new Game(this.self.ribbon, gameid, options, players, this.self.isPlayer, this.self.ribbon.aistyle);
      }
    
      this.gameStart = () => {
        if (this.self.infNext) {
          this.self.ribbon.sendChatMessage("Type !help for some commands.")
        }
        this.self.game.start();
      }
    
      this.gameEnd = () => {
        try {
          this.self.game.end();
        } catch {}
      }
    
      this.id = () => {
        return this.self.settings.id;
      }
    
      this.players = () => {
        return [...this.self.playerBrackets].filter(bracket => bracket[1] === "player").map(bracket => bracket[0]);
      }
    
      this.spectators = () => {
        return [...this.self.playerBrackets].filter(bracket => bracket[1] === "spectator").map(bracket => bracket[0]);
      }
    
      this.memberCount = () => {
        return this.self.playerBrackets.size;
      }
    
      this.setRoomConfig = (data) => {
        this.self.ribbon.sendMessage({
          command: "updateconfig",
          data
        });
      }
    
      this.setName = (name) => {
        this.setRoomConfig([
          {
            index: "meta.name",
            value: name
          }
        ]);
      }
    
      this.switchPlayerBracket = (player, bracket) => {
        this.self.ribbon.sendMessage({
          command: "switchbrackethost",
          data: {
            uid: player,
            bracket
          }
        });
      }
    
      this.kickPlayer = (player) => {
        this.self.ribbon.sendMessage({command: "kick", data: player});
      }
    
      this.giveHost = (host) => {
        this.self.settings.players.forEach(player => {
          if (player.username == host.toLowerCase()) {
            host = player._id;
          }
        });
        this.self.ribbon.sendMessage({command: "transferownership", data: host});
      }
    
      this.takeHost = () => {
        this.self.ribbon.sendMessage({command: "takeownership"});
      }
    
      this.start = () => {
        this.self.ribbon.sendMessage({command: "startroom"});
      }
    
      this.setRoomID = (id) => {
        this.self.ribbon.sendMessage({command: "setroomid", data: id});
      }
    }
  }
}

module.exports = Room;