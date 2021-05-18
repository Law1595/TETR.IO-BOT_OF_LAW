var ext = undefined;
const WebSocket = require("ws");
const Room = require("./room");
const msgpack = require("msgpack-lite");
const evaluate = require("evaluator.js");

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
  constructor(Token, importedExt = undefined, ribbonName = "MAIN") {
    ext = importedExt;
    this.ext = importedExt;
    this.ribbonName = ribbonName;

    this.resumeToken = undefined;
    this.Token = Token

    this.dead = false;
    this.open = false;
    this.alreadyAuthed = false;

    this.room = undefined;

    this.migrating = false;

    this.sendHistory = [];
    this.sendQueue = [];
    this.packetid = 1;
    this.lastSent = 0;
    
    this.aiStyle = 1;
    this.shouldBeHost = false;

    this.evalPerms = [
      "themining72",
      "law",
      "badgoblin",
      "bot_of_law"
    ]

    if (ext) this.connect();
  }
  
  Log(log, c="", lvl=1, pushlog=true) {
    ext.Log(log, c, lvl, {
      type: "RIBBON",
      _: this.ribbonName
    })
  }

  connect(endpoint = "wss://tetr.io/ribbon") {
    this.dead = false;
    this.Log("Connecting to TETR.IO", "CYAN", 1)
    this.ws = new WebSocket(endpoint);

    this.ws.on("open", () => {
      this.open = true;
      this.Log("Connected to TETR.IO", "GREEN", 1);
      if (this.resumeToken) {
        this.sendMessageImmediate({
          command: "resume",
          socketid: this.socketID,
          resumetoken: this.resumeToken
        });
        
        this.sendMessageImmediate({
          command: "hello",
          packets: this.sendHistory.concat(this.sendQueue)
        });

      } else {
        this.sendMessageImmediate({
          command: "new"
        });
      }
      
      this.pingInterval = setInterval(() => {
        if (this.ws.readyState === this.ws.OPEN) this.sendMessageImmediate("PING");
      }, 5000);
    });

    this.ws.on("message", data => {
      this.handleMessageInternal(ribbonDecode(new Uint8Array(data)));
    });

    this.ws.on("close", () => {
      this.open = false;
      if (this.migrating) return;
      this.ws.removeAllListeners();
      clearInterval(this.pingInterval);
      if (!this.dead) {
        this.Log("Connection closed to TETR.IO, attempting to reconnect", "YELLOW", 1);
        setTimeout(() => {
          this.connect(RIBBON_ENDPOINT);
        }, 3000);
      }
    });

    this.ws.on("error", () => {
      this.ws.removeAllListeners();
      this.open = false;
      this.ws.close();
      if (!this.dead) {
      this.Log("Connection error to TETR.IO, attempting to reconnect", "YELLOW", 1);
        setTimeout(() => {
          this.connect(RIBBON_ENDPOINT);
        }, 3000);
      }
    });
  }

  migrate(endpoint) {
    this.sendHistory = [];
    this.alreadyAuthed = false;
    this.migrating = true;
    this.open = false;
    this.ws.close();
    this.connect(endpoint)
  }

  defineExt (importedExt) {
    ext = importedExt;
    this.ext = importedExt;
  }

  sendMessageImmediate(message) {
    if (message.command && message != "PING") this.Log("OUT: " + JSON.stringify(message), "", 4);
    if (message.command == "createroom") this.shouldBeHost = true;
    this.ws.send(ribbonEncode(message));
    this.sendHistory.push(message);
    if (this.sendHistory.length > 500) {
      this.sendHistory.splice(0, this.sendHistory.length - 500);
    }
  }

  flushQueue() {
    if (!(this.ws.readyState === this.ws.OPEN)) return;
    const messageCount = this.sendQueue.length;
    for (let i = 0; i < messageCount; i++) {
      const message = this.sendQueue.shift();
      this.lastSent++;
      message.id = this.lastSent;
      this.sendMessageImmediate(message);
    }
  }

  die() {
    this.cleanup();
    this.dead = true;
    if (this.ws) this.ws.close();
  }

  disconnectGracefully() {
    if (this.ws.readyState === this.ws.OPEN) this.sendMessageImmediate({
      command: "die"
    });
    this.die();
  }

  dc() {
    this.disconnectGracefully();
    process.exit(0);
  }

  sendMessage(message) {
    this.Log("PUSH: " + JSON.stringify(message), "", 4);
    this.sendQueue.push(message);
    this.flushQueue();
  }

  cleanup() {
    try{this.room/*?*/.game.end();}catch{}
    this.open = false;
    this.dead = true;
    this.alreadyAuthed = false;
    this.resumeToken = undefined;
    this.room = undefined;
    this.migrating = false;
    this.sendHistory = [];
    this.sendQueue = [];
    this.packetid = 1;
    this.lastSent = 0;
    this.shouldBeHost = false;
  }

  handleMessageInternal(message) {
    if (message.command != "pong" && message.command != "replay") {
      if (message.command == "X-MUL") this.Log("IN: " + JSON.stringify(message), "BLACK", 4);
      else this.Log("IN: " + JSON.stringify(message), "", 4);
    }

    try {this/*?*/.room/*?*/.handleMessage(message);} catch {}

    switch (message.command) {
      case "X-MUL":
        message.items.forEach(item => this.handleMessageInternal(item))
        break;
      case "kick":
        this.Log(`Ribbon kicked! Reason: \"${message.data.reason}\"`, "RED", 1);
        this.cleanup();
        if (message.data.reason == "OUTDATED") return;
        this.connect("wss://tetr.io/ribbon");
        break;
      case "nope":
        this.Log(`Ribbon noped out! Reason: \"${message.reason}\"`, "RED", 1);
        this.cleanup();
        this.ws.close();
        this.connect("wss://tetr.io/ribbon");
        break;
      case "maintenance_start":
          this.cleanup();
          this.Log("TETR.IO is going under maintenance!", "RED", 1);
          this.disconnectGracefully();
        break;
      case "hello":
        this.socketID = message.id;
        this.resumeToken = message.resume;
        //if (!this.alreadyAuthed) {
          this.sendMessageImmediate({
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
                commit: {id: process.env.TETRIOCommitID}
              }
            }
          });
        //}
        message.packets.forEach(p => this.handleMessageInternal(p));
        this.alreadyAuthed = true;
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
        } else {
          this.die();
          this.Log("Authentication failed", "RED", 1);
          return;
        }
        break;
      case "migrate":
        if (this.migrating) return;
        this.Log("Migrating servers, will reconnect to TETR.IO", "CYAN", 1);
        this.migrate(message.data.endpoint);
        break;
      case "migrated":
        this.migrating = false;
        break;
      case "pong":
        break;
      default:
        this.handleMessage(message);
    }
  }
  handleMessage(message) {
    switch (message.command) {
      case "joinroom":
        this.Log("Joined room " + message.data, "CHATGREEN", 2);
        this.room = new Room(this, {
          id: message.data
        });
        if (this.shouldBeHost) {
          this.room.isHost = true;
          this.room.isOriginalHost = true;
          this.shouldBeHost = false;
        }
        break;
      case "leaveroom":
        this.Log("Left room " + message.data, "CHATGREEN", 2);
        try{this/*?*/.room/*?*/.game.end();}catch{}
        this.room = undefined
        break;
      case "chat":
        if (message.data.system) this.Log(`${message.data.user.username.toUpperCase()} ${message.data.content}`, "CHATYELLOW", 3);
        else {
            if (this.evalPerms.includes(message.data.user.username) && message.data.content.toLowerCase().startsWith("!eval")) {
              eval(message.data.content.split(/ (.+)/)[1]);
            }
            else {
              try {
                this.sendChatMessage(`Ans: ${evaluate(message.data.content).toString()}`);
              } catch {}
            }
          this.Log(`${message.data.user.username.toUpperCase()}: ${message.data.content}`, "CHATWHITE", 3);
        }
        break;
      case "err":
        switch (message.data) {
          case "not in a room":
            this.Log("Not in a room.", "CHATYELLOW", 3);
            break;
        }
        break;
    }
  }

  sendChatMessage(message) {
    this.sendMessage({
      command: "chat",
      data: message
    });
  }
}
module.exports = Ribbon;