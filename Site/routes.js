const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const session = require('express-session');
const cookieParser = require('cookie-parser');
const minify = require('express-minify');
const cors = require('cors')
const compression = require('compression');
const envfile = require('envfile');
const fs = require('fs');
const { exec } = require('child_process');

function makeid(length) {
  var result           = [];
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
  }
  return result.join('');
}

var Ribbon = undefined;
var socketio = undefined;
var ribbon = undefined;
var sockets = undefined;
var logs = undefined;
var ext = undefined;
var url = makeid(128)

function SetRoutes(app) {
  app.use(cors({
    origin: 'https://tetr.io'
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  //app.use(minify());
  //app.use(compression());
  //app.use(upload.array());
  //app.use(cookieParser());
  //app.use(session({  
  //  name: "Auth",
  //  secret: process.env.Pass,
  //  resave: false,
  //  saveUninitialized: false
  //}));

  app.post('/update', function(req, res) {
    res.set('Cache-Control', 'no-store');
    if (req.body.Pass != process.env.Pass) {
      res.status(401);
      res.send("");
      return;
    }
    process.env.TETRIOCommitID = req.body.commitID;
    exec(`echo -n "${req.body.commitID}" > ./.TETRIOCommitID`);
    res.status(200);
    res.send("");
    ext.Log("Ribbon updated, will reboot.", "GREEN", 1)
    ribbon.disconnectGracefully();
    ribbon.connect();
  });

  app.get('/' + url, function(req, res) {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname + '/Pages/index.html'));
  });

  app.get('/', function(req, res) {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname + '/Pages/login.html'));
  });

  app.post('/', function(req, res) {
    res.set('Cache-Control', 'no-store');
    if (process.env.Pass == req.body.pass) {
      ext.Log("A client has logged in", "GREEN", 2)
      res.redirect('/' + url);
    }
    else {
      ext.Log("A client has failed to log in", "YELLOW", 2);
      res.sendFile(path.join(__dirname + '/Pages/loginfail.html'));
    }
  });

  app.get('/css/:css', function(req, res) {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname + '/Pages/!css/' + req.params.css));
  });

  app.get('/js/:js', function(req, res) {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname + '/Pages/!js/' + req.params.js));
  });
}

function init(tRibbon, tsocketio, tribbon, tsockets, tlogs, text) {
  Ribbon = tRibbon;
  socketio = tsocketio;
  ribbon = tribbon;
  sockets = tsockets;
  logs = tlogs;
  ext = text;
  return SetRoutes;
}

module.exports = init;