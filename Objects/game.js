const AI = require("../AI/ai");

class Game {
  constructor(ribbon, gameid, options, players, isPlayer=true, ai=1) {
    this.ribbon = ribbon;
    this.tetriminos = Tetriminos;

    this.seedgen = piecesGen(options.seed)
    //this.seedgen.shuffleArray(minotypes) // this would generate the first bag
    //this.seedgen.shuffleArray(minotypes) // this would generate the second bag

    this.gameid = gameid;
    this.options = options;
    this.players = players;
    this.otherplayers = [];
    this.ai = ai;
    this.speedlimit = 0;

    this.ended = false;

    this.bag = 0;
    this.hold = this.tetriminos.Empty;
    this.next = [];
    this.board = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    for (var i = 0; i < players.length; i++) {
      if (players[i].user._id != "6058ca3f185c8f2393446d8b") {
        this.otherplayers.push(players[i])
      }
    }
  }

  //Speed Limit 0 = Max
  startAI(speedlimit = 0) {
    this.ribbon.sendMessageImmediate({
      command: "replay",
      data: {
        listenID: this.listenid,
        frames: [{
          frame: 0,
          type: "full",
          data: {
            successful: undefined,
            gameoverreason: undefined,
            replay: undefined,
            source: undefined,
            options: this.options
          }
        }]
      }
    });
    this.aiinterval = setInterval(() => {
      this.ribbon.sendMessageImmediate({
        command: "replay",
        data: {
          listenID: this.gameid,
          frames: []
        }
      });
    }, 1000);
  }

  start() {
    setTimeout(() => {
      this.aiinterval = AI.AI[this.ai - 1](this, this.ribbon.ext);
    }, this.options.prestart + this.options.precountdown + (this.options.countdown_count * this.options.countdown_interval));
  }

  end() {
    clearInterval(this.aiinterval);
    this.ended = true;
    AI.end();
  }
}

module.exports = Game;