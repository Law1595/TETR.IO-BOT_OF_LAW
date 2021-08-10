const os = require("os");
const osUtils = require("os-utils"); 

var Ribbon = undefined;
var socketio = undefined;
var ribbon = undefined;
var sockets = undefined;
var logs = undefined;

COLORSOLD = {
  "PURPLE": "\033[95m",
  "BLUE": "\033[94m",
  "CYAN": "\033[96m",
  "GREEN": "\033[92m",
  "YELLOW": "\033[93m",
  "RED": "\033[91m",
  "END": "\033[0m",
  "BOLD": "\033[1m",
  "UNDERLINE": "\033[4m",
  "": ""
}

COLORS = {
  "BLACK": "\033[90m", // Redundant Logs
  "RED": "\033[91m", // Usually a fatal error
  "GREEN": "\033[92m", // Done or Success
  "YELLOW": "\033[93m", // Warning
  "BLUE": "\033[94m",
  "PURPLE": "\033[95m", // Other User"s Actions
  "CYAN": "\033[96m", // Doing Something
  "WHITE": "\033[97m", // Raw Logs
  "END": "\033[0m",
  "BOLD": "\033[1m",
  "UNDERLINE": "\033[4m",
  "": ""
}

class piecesGen {
  constructor(seed) {
    this.startSeed = seed % 2147483647;
    this.curSeed = seed % 2147483647;
    this.curBag = 0;
  }

  next() {
    return this.curSeed = 16807 * this.curSeed % 2147483647;
  }

  nextFloat() {
    return (this.next() - 1) / 2147483646;
  }

  nextBag(minos = ["z", "l", "o", "s", "i", "j", "t"]) {
    this.curBag++;
    let randomPiece, minosLeft = minos.length;

    if (minosLeft == 0) return minos;

    for (;--minosLeft;) {
      randomPiece = Math.floor(this.nextFloat() * (minosLeft + 1));
      [minos[minosLeft], minos[randomPiece]] = [minos[randomPiece], minos[minosLeft]];
    }
    return minos;
  }

  getBag(bag, toString = true) {
    if(bag < 1 || bag > 10000) return {
      success: false,
      error: (bag < 1) ? "Bag count under 1!" : "Too many bags into the future!"
    };

    var gen = new piecesGen(this.startSeed);
    var wantedBag = undefined;

    while(gen.curBag != bag) wantedBag = gen.nextBag();

    return ((toString) ? {
      success: true,
      data: wantedBag.join("")
    } : {
      success: true,
      data: [wantedBag]
    });
  }

  getBags(first, last, toString = true) {
    if (first == last) return this.getBag(first, toString);
    if (first < 1 || last > 10000 || first > last) return {
      success: false,
      error: (first > last || first < 1) ? "Bag count under 1!" : "Too many bags into the future!"
    };

    var gen = new piecesGen(this.startSeed);
    var wantedBags = [];

    while (gen.curBag != first - 1) gen.nextBag();
    while (gen.curBag < (((last - first) > 20) ? first + 20 : last)) wantedBags.push(((toString) ? gen.nextBag().join("") : gen.nextBag()));

    return ((toString) ? {
      success: true,
      data: wantedBags.join(" ").toUpperCase()
    } : {
      success: true,
      data: wantedBags
    });
  }

  getPieces(first, last, toString = true) {
    if (first < 1 || last > 70000 || first > last) return {
      success: false,
      error: (first > last || first < 1) ? "Pieces count under 1!" : "Too many pieces into the future!"
    };

    var fromBag = ((Math.floor(first / 7) == (first / 7)) ? first / 7 : Math.floor(first / 7) + 1);
    var untilBag = Math.floor(last / 7) + 1;
    var removeFromStart = (((first % 7) == 0) ? 6 : (first % 7) - 1);
    var removeFromEnd = 7 - (last % 7);
    var wantedPieces = this.getBags(fromBag, untilBag, false).data;

    //console.log(fromBag);
    //console.log(untilBag);
    //console.log(removeFromStart);
    //console.log(removeFromEnd);
    //console.log(wantedPieces);

    //for (;--removeFromStart;) wantedPieces[0].shift();
    //for (;--removeFromEnd;) wantedPieces[wantedPieces.length - 1].pop();
    for (var i = 0; i < removeFromStart; i++) wantedPieces[0].shift();
    for (var i = 0; i < removeFromEnd; i++) wantedPieces[wantedPieces.length - 1].pop();

    if (toString) {
      var wantedPiecesClone = [];
      wantedPieces.forEach(pieceBag => wantedPiecesClone.push(pieceBag.join("")));
      wantedPieces = wantedPiecesClone.join(" ");
    }

    return ((toString) ? {
      success: true,
      data: wantedPieces.toUpperCase()
    } : {
      success: true,
      data: wantedPieces
    });
  }
}

function Log(log, c = "", lvl = 1, logclass = { type: "MAIN" }, pushlog = true) {
  if (lvl <= process.env.LogLevel) console.log(COLORS["YELLOW"] + "[BotClient] " + COLORS["END"] + ((c.startsWith("CHAT")) ? "PURPLE" : COLORS[c]) + log + COLORS["END"]);
  if (pushlog) {
    if (c.startsWith("CHAT")) {
      logs.push([log, c]);
      if (socketio) sockets.forEach(socket => socket.emit("log", [log, c]));
      return;
    }
    logtopush = [`[${new Date().toISOString().replace(/^(.*?)T/, "").replace(/\..+/, "")}] ${log}`, c];
    logs.push(logtopush);
    if (socketio) sockets.forEach(socket => socket.emit("log", logtopush));
  }
}

function clearLog() {
  logs = [];
  socketio.emit("clr", "");
}

sendLeftRes = setInterval(() => {
  osUtils.cpuUsage(function(v) { sockets.forEach(socket => socket.emit("cpu", `${v}% (Currently very inaccurate)`)); });
  sockets.forEach(socket => socket.emit("ram", `${(((os.totalmem() - os.freemem())/os.totalmem())*100).toFixed(2)}% (${os.totalmem() - os.freemem()}/${os.totalmem()})`));
  sockets.forEach(socket => socket.emit("usr", sockets.length));
}, 1000);

function init(tRibbon, tsocketio, tribbon, tsockets, tlogs) {
  Ribbon = tRibbon;
  socketio = tsocketio;
  ribbon = tribbon;
  sockets = tsockets;
  logs = tlogs;
  return {
    Log: Log,
    clearLog: clearLog,
    piecesGen: piecesGen,
    h: "bot"
  }
}

module.exports = init;
//module.exports = {Log, clearLog};