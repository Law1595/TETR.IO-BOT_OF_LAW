var _ = require('lodash');
const afk = require('./ais/afk');

minotypes = ["z", "l", "o", "s", "i", "j", "t"];

Tetriminos = {
  I: {
    Up: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    Down: [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    Left: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    Right: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]]
  },
  J: {
    Up: [[0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0]],
    Down: [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    Left: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    Right: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]]
  },
  L: {
    Up: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    Down: [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    Left: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    Right: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]]
  },
  O: {
    Up: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    Down: [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    Left: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    Right: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]]
  },
  S: {
    Up: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    Down: [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    Left: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    Right: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]]
  },
  T: {
    Up: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    Down: [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    Left: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    Right: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]]
  },
  Z: {
    Up: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    Down: [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    Left: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    Right: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]]
  },
  Empty: {}
}

Frames = {
  Start: {
    frame: 0,
    type: "start",
    data: {}
  },
  Targets: {
    frame: 0,
    type: "targets",
    data: {
      id: "diyusi",
      frame: 0,
      type: "targets",
      data: [] // Player ID(s?)
    }
  }
};

function createFrame(framestring, argsarray=null) {
  switch (framestring) {
    case "Start":
      var frame = _.cloneDeep(Frames.Start);
      return frame;
      break;
    case "Targets":
      var frame = _.cloneDeep(Frames.Targets);

      frame.data.data = argsarray[0];

      return frame
      break;
  }
}

class AI {
  constructor(AIType) {
    switch(AIType) {
      case "AFK":
        afk();

      
    }
  }

  stopAI() {
    
  }
}

ended = true;

module.exports = {
  end: function end() { ended = true; },
  AI: [
    function afk(game, ext) {
      ext.Log("Game starting with AI: AFK", "GREEN", 1)
      ended = false;
      game.ribbon.sendMessage({
        command: "replay",
        data: {
          listenID: game.gameid,
          frames: [
            createFrame("Start"),
            createFrame("Targets", game.otherplayers[Math.floor(Math.random() * game.otherplayers.length)].user._id)
          ],
          provisioned: 0
        }
      })

      var provisioned = 0;

      return setInterval(() => {
        provisioned++;
        game.ribbon.sendMessage({
          command: "replay",
          data: {
            listenID: game.gameid,
            frames: [],
            provisioned: provisioned * 60
          }
        });
      }, 1000);
    },





    function freestyle(game, ext) {
      ext.Log("Game starting with AI: Freestyle", "GREEN", 1)
      ended = false;
      game.ribbon.sendMessage({
        command: "replay",
        data: {
          listenID: game.gameid,
          frames: [
            createFrame("Start"),
            createFrame("Targets", game.otherplayers[Math.floor(Math.random() * game.otherplayers.length)].user._id)
          ],
          provisioned: 0
        }
      })

      var provisioned = 0;

      return setInterval(() => {
        provisioned++;
        game.ribbon.sendMessage({
          command: "replay",
          data: {
            listenID: game.gameid,
            frames: [],
            provisioned: provisioned * 60
          }
        });
      }, 1000);
    },





    function sticktofreestyle(game, ext) {
      ext.Log("Game starting with AI: Stick > Freestlyle", "GREEN", 1)
      ended = false;
      game.ribbon.sendMessage({
        command: "replay",
        data: {
          listenID: game.gameid,
          frames: [
            createFrame("Start"),
            createFrame("Targets", game.otherplayers[Math.floor(Math.random() * game.otherplayers.length)].user._id)
          ],
          provisioned: 0
        }
      })

      var curframe = 0;
      var provisioned = 0;
      var frames = [];
      var stickfinished = false;

      function stickspin(timestamp) {
        curframe++;
        //if (start === undefined)
        //  start = timestamp;
        //const elapsed = timestamp - start;

        if (game.next.length = 0) {
          game.next = game.seedgen.shuffleArray(minotypes);
          game.bag = game.seedgen.getCurrentBag();
        }
        //if (!game.next.indexOf('t') < game.next.indexOf('o') && !game.next.indexOf('s') < game.next.indexOf('o')) {
        //  switch (game.bag) {
        //    case 1:
        //      switch (game.next[0]) {
        //        case 'i':
                  frames.push({
                    frame: _.cloneDeep(curframe),
                    type: "keydown",
                    data: {
                      key: "rotateCW",
                      provisioned: _.cloneDeep(curframe),
                      subframe: 0
                    }
                  });
                  frames.push({
                    frame: _.cloneDeep(curframe),
                    type: "keyup",
                    data: {
                      key: "rotateCW",
                      provisioned: _.cloneDeep(curframe),
                      subframe: 1
                    }
                  });
                  frames.push({
                    frame: _.cloneDeep(curframe),
                    type: "keydown",
                    data: {
                      key: "moveLeft",
                      provisioned: _.cloneDeep(curframe),
                      subframe: 2
                    }
                  });
                  curframe++;
                  curframe++;
                  frames.push({
                    frame: _.cloneDeep(curframe),
                    type: "keyup",
                    data: {
                      key: "moveLeft",
                      provisioned: _.cloneDeep(curframe),
                      subframe: 0
                    }
                  });
                  frames.push({
                    frame: _.cloneDeep(curframe),
                    type: "keydown",
                    data: {
                      key: "hardDrop",
                      provisioned: _.cloneDeep(curframe),
                      subframe: 1
                    }
                  });
                  frames.push({
                    frame: _.cloneDeep(curframe),
                    type: "keyup",
                    data: {
                      key: "hardDrop",
                      provisioned: _.cloneDeep(curframe),
                      subframe: 2
                    }
                  });
      //            break;
      //          case 'j':
//
      //            break;
       //       }
              game.next.shift();
      //        break;
      //    }
      //  }
      //  else {
      //    stickfinished = true;
      //  }

        //if (!ended || !stickfinished) {
          requestAnimationFrame(step);
        //}
        //else if (stickfinished) {

        //}
      }

      //if (game.next.indexOf('o') < game.next.indexOf('t') || game.next.indexOf('o') < game.next.indexOf('s') || game.next.indexOf('o') < game.next.indexOf('z')) {
        requestAnimationFrame(stickspin);
      //}
      //else {

      //}

      return setInterval(() => {
        provisioned++;
        game.ribbon.sendMessage({
          command: "replay",
          data: {
            listenID: game.gameid,
            frames: frames,
            provisioned: provisioned * 60
          }
        });
      }, 1000);
    },





    function pcspam(game, ext) {
      ext.Log("Game starting with AI: PC Spam", "GREEN", 1)
      ended = false;
      game.ribbon.sendMessage({
        command: "replay",
        data: {
          listenID: game.gameid,
          frames: [
            createFrame("Start"),
            createFrame("Targets", game.otherplayers[Math.floor(Math.random() * game.otherplayers.length)].user._id)
          ],
          provisioned: 0
        }
      })

      var provisioned = 0;

      return setInterval(() => {
        provisioned++;
        game.ribbon.sendMessage({
          command: "replay",
          data: {
            listenID: game.gameid,
            frames: [],
            provisioned: provisioned * 60
          }
        });
      }, 1000);
    },





    function frozen(game, ext) {
      ext.Log("Game starting with AI: Frozen", "GREEN", 1)
      ended = false;
      return setInterval(() => {
        game.ribbon.sendMessageImmediate({
          command: "replay",
          data: {
            listenID: game.gameid,
            frames: []
          }
        });
      }, 1000);
    },





    function selfko(game, ext) {

    },
  ]
};  