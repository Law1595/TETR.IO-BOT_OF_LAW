var ext = undefined;
const WebSocket = require("ws");
const Room = require("./data/room");
const Game = require("./data/game");
const msgpack = require("msgpack-lite");
const evaluate = require("evaluator.js");

const CLIENT_VERSION = {
  "id": "2d05c95",
  "time": 1617227309000
};

const RIBBON_ENDPOINT = "wss://tetr.io/ribbon";
const RIBBON_EXTRACTED_ID_TAG = new Uint8Array([174]);
const RIBBON_STANDARD_ID_TAG = new Uint8Array([69]);
const RIBBON_BATCH_TAG = new Uint8Array([88]);
const RIBBON_EXTENSION_TAG = new Uint8Array([0xB0]);
const RIBBON_EXTENSIONS = new Map();

RIBBON_EXTENSIONS.set(0x0B, {
  command: "ping"
});
RIBBON_EXTENSIONS.set("PING", new Uint8Array([0xB0, 0x0B]));
RIBBON_EXTENSIONS.set(0x0C, {
  command: "pong"
});
RIBBON_EXTENSIONS.set("PONG", new Uint8Array([0xB0, 0x0C]));

function ribbonEncode(packet) {
  if (typeof packet === "string") {
    const found = RIBBON_EXTENSIONS.get(packet);
    if (found) {
      return found;
    }
  }
  let prependable = RIBBON_STANDARD_ID_TAG;
  if (typeof packet === "object" && packet.id && packet.command) {
    const id = packet.id;
    prependable = new Uint8Array(5);
    prependable.set(RIBBON_EXTRACTED_ID_TAG, 0);
    const view = new DataView(prependable.buffer);
    view.setUint32(1, id, false);
  }
  const msgpacked = msgpack.encode(packet);
  const merged = new Uint8Array(prependable.length + msgpacked.length);
  merged.set(prependable, 0);
  merged.set(msgpacked, prependable.length);
  return merged;
}

function ribbonDecode(packet) {
  if (packet[0] === RIBBON_EXTENSION_TAG[0]) {
    const found = RIBBON_EXTENSIONS.get(packet[1]);
    if (!found) {
      console.error(`Unknown Ribbon extension ${ packet[1] }!`);
      console.error(packet);
      throw "Unknown extension";
    }
    return found;
  } else if (packet[0] === RIBBON_STANDARD_ID_TAG[0]) {
    return msgpack.decode(packet.slice(1));
  } else if (packet[0] === RIBBON_EXTRACTED_ID_TAG[0]) {
    const object = msgpack.decode(packet.slice(5));
    const view = new DataView(packet.buffer);
    const id = view.getUint32(1, false);
    object.id = id;
    return object;
  } else if (packet[0] === RIBBON_BATCH_TAG[0]) {
    const items = [];
    const lengths = [];
    const view = new DataView(packet.buffer);
    for (let i = 0; true; i++) {
      const length = view.getUint32(1 + (i * 4), false);
      if (length === 0) {
        break;
      }
      lengths.push(length);
    }
    let pointer = 0;
    for (let i = 0; i < lengths.length; i++) {
      items.push(packet.slice(1 + (lengths.length * 4) + 4 + pointer, 1 + (lengths.length * 4) + 4 + pointer + lengths[i]));
      pointer += lengths[i];
    }
    return {
      command: "X-MUL",
      items: items.map(o => ribbonDecode(o))
    };
  } else {
    return msgpack.decode(packet);
  }
}

class Ribbon {
  constructor(Token, text=undefined) {
    ext = text;
    this.ext = text;

    this.resume_token = undefined;
    this.Token = Token

    this.dead = false;
    this.open = false;
    this.alreadyauthed = false;

    this.room = undefined;

    this.migrating = false;

    this.send_history = [];
    this.send_queue = [];
    this.packetid = 1;
    this.aiStyle = 1;
    
    if (ext != undefined) {
      this.connect("wss://tetr.io/ribbon");
    }
  }
  
  connect(endpoint) {
    if (this.ws) {
      this.migrating = true;
      this.ws.close();
    }

    ext.Log("Connecting to TETR.IO", "CYAN", 1)
    this.ws = new WebSocket(endpoint);

    this.ws.on("open", () => {
      this.open = true;
      ext.Log("Connected to TETR.IO", "GREEN", 1);
      if (this.resume_token) {
        this.sendMessageImmediate({
          command: "resume",
          socketid: this.socket_id,
          resumetoken: this.resume_token
        });
        
        this.sendMessageImmediate({
          command: "hello",
          packets: this.send_queue.concat(this.send_history)
        });
        this.migrating = false;

      } else {
        this.sendMessageImmediate({
          command: "new"
        });
      }
      
      this.pingInterval = setInterval(() => {
        //this.ws.send(new Uint8Array([0xB0, 0x0B]));
        this.sendMessageImmediate("PING");
      }, 5000);
    });

    this.ws.on("message", data => {
      this.handleMessageInternal(ribbonDecode(new Uint8Array(data)));
      //const message = ribbonDecode(new Uint8Array(data));
      //message.forEach(msg => this.handleMessageInternal(msg));
    });

    this.ws.on("close", () => {
      if (this.migrating) {
        return;
      }
      this.ws.removeAllListeners();
      this.open = false;
      clearInterval(this.pingInterval);
      if (!this.dead) {
        ext.Log("Connection closed to TETR.IO, attempting to reconnect", "YELLOW", 1);
        setTimeout(() => {
          this.connect(RIBBON_ENDPOINT);
        }, 5000);
      }
    });

    this.ws.on("error", () => {
      this.ws.removeAllListeners();
      this.open = false;
      this.ws.close();
      if (!this.dead) {
      ext.Log("Connection error to TETR.IO, attempting to reconnect", "YELLOW", 1);
        setTimeout(() => {
          this.connect(RIBBON_ENDPOINT);
        }, 5000);
      }
    });
  }

  // log(message) {
  //     console.log(`[${this.socket_id || "new ribbon"}/${this.room ? this.room.id : "no room"}] ${message}`);
  // }

  defineExt (text) {
    ext = text;
    this.ext = text;
    this.connect("wss://tetr.io/ribbon");
  }

  sendMessageImmediate(message) {
    if (message.command != undefined || message != "PING") {
      ext.Log("OUT: " + JSON.stringify(message), "", 4);
    }
    try {
      this.ws.send(ribbonEncode(message));
    }
    catch {
      var timer = setInterval(() => {
        try {
          this.ws.send(ribbonEncode(message));
          clearInterval(timer);
        } catch {}
      }, 1000)
    }
    if (message.command != "chat") this.send_history.push(message);
    if (this.send_history.length > 500) {
      this.send_history.splice(0, this.send_history.length - 500);
    }
  }

  sendMessageImmediateNoLog(message) {
    try {
      this.ws.send(message);
    } catch {
      this.sendMessageImmediateNoLog(message);
    }
  }

  flushQueue() {
    if (!this.open) return;
    const messageCount = this.send_queue.length;
    for (let i = 0; i < messageCount; i++) {
      const message = this.send_queue.shift();
      this.lastSent++;
      message.id = this.lastSent;
      this.sendMessageImmediate(message);
    }
  }

  die() {
    this.dead = true;
    if (this.ws) {
      this.ws.close();
      this.cleanup();
    }
  }

  disconnectGracefully() {
    this.sendMessageImmediate({
      command: "die"
    });
    this.die();
  }

  sendMessage(message) {
    ext.Log("PUSH: " + JSON.stringify(message), "", 4);
    this.send_queue.push(message);
    this.flushQueue();
  }

  cleanup() {
    try {
      if(this.room.game != undefined) {
        this.room.game.end();
      }
    } catch {}
  }

  handleMessageInternal(message) {
    if (message.command != "pong" && message.command != "replay") {
      if (message.command == "X-MUL") {
        ext.Log("IN: " + JSON.stringify(message), "BLACK", 4);
      }
      else {
        ext.Log("IN: " + JSON.stringify(message), "", 4);
      }
    }

    if (this.room != undefined) {
      this.room.handleMessage(message);
    }

    switch (message.command) {
      case "X-MUL":
        message.items.forEach(item => this.handleMessageInternal(item))
        break;
      case "kick":
        ext.Log("Ribbon kicked! " + JSON.stringify(message), "RED", 1);
        this.alreadyauthed = false;
        this.resume_token = undefined;
        this.cleanup();
        this.connect("wss://tetr.io/ribbon");
        break;
      case "nope":
        ext.Log("Ribbon noped out! " + JSON.stringify(message), "RED", 1);
        this.alreadyauthed = false;
        this.resume_token = undefined;
        this.ws.close();
        this.cleanup();
        this.connect("wss://tetr.io/ribbon");
        break;
      case "hello":
        this.socket_id = message.id;
        this.resume_token = message.resume;
        if (!this.alreadyauthed) {
          this.sendMessageImmediate({ // auth the client
            command: "authorize",
            id: this.lastSent,
            data: {
              token: this.Token,
              handling: {
                arr: 1,
                das: 1,
                sdf: 41,
                safelock: false
              },
              signature: {
                commit: CLIENT_VERSION
              }
            }
          });
        }
        message.packets.forEach(p => this.handleMessage(p)); // handle any dropped clients
        this.alreadyauthed = true;
        break;
      case "authorize":
        if (message.data.success) {
          this.sendMessageImmediate({
            command: "social.presence",
            data: {
              status: "online",
              detail: ""
            }
          })
          // this.emit("ready");
        } else {
          this.die();
          // this.emit("error", "failed to authorise");
        }
        break;
      case "migrate":
        ext.Log("Migrating servers, will reconnect to TETR.IO", "CYAN", 1)
        this.alreadyauthed = false;
        this.connect(message.data.endpoint);
        break;
      case "pong":
        break; // todo: we should do something with this eventually.
      default:
        this.handleMessage(message);
    }
  }
  handleMessage(message) {
    switch (message.command) {
      case "joinroom":
        ext.Log("Joined room " + message.data, "GREEN", 2);
        this.room = new Room(this, {
          id: message.data
        });
        break;
      case "leaveroom":
        ext.Log("Left room " + message.data, "GREEN", 2);
        this.room = undefined
        break;
      case "chat":
        if (message.data.system) {
          ext.Log(`${message.data.user.username.toUpperCase()} ${message.data.content}`, "WHITE", 3);
        }
        else {
          try {
            if ((message.data.user.username == "themining72" || message.data.user.username == "law") && message.data.content.toLowerCase().startsWith("!eval")) {
              eval(message.data.content.split(/ (.+)/)[1]);
            }
            else if (message.data.user.username != "bot_of_law") {
              this.sendMessage({
                command: "chat",
                data: `Ans: ${evaluate(message.data.content).toString()}`
              });
            }
          } catch {}
          ext.Log(`${message.data.user.username.toUpperCase()} says: ${message.data.content}`, "PURPLE", 3);
        }
        break;
    }
    // this.emit(message.command, message.data);
  }
  createRoom(isPrivate) {
    this.sendMessage({
      command: "createroom",
      data: isPrivate ? "private" : "public"
    });
  }
  joinRoom(code) {
    this.sendMessage({
      command: "joinroom",
      data: code
    });
  }
  socialInvite(player) {
    this.sendMessage({
      command: "social.invite",
      data: player
    });
  }
  sendDM(recipient, message) {
    this.sendMessage({
      command: "social.dm",
      data: {
        recipient,
        msg: message
      }
    });
  }
  sendChatMessage(message) {
    this.sendMessage({
      command: "chat",
      data: message
    });
  }
}
module.exports = Ribbon;