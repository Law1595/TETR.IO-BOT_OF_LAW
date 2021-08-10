var socket = io();
var cur = 1;
var prevauth = false;
var prevmsgs = [];
var onmsg = 0;
var curvalue = "{\"command\": \"\", \"data\": \"\"}";
var name = "Unknown";
var firstmsg = true;
var igfirstmsg = true;
var aibuttons = Array.from(document.getElementsByName("aibutton"));

window.history.replaceState({}, "BOT_OF_LAW Web Console", "https://tetrio-bot-node.themining72.repl.co/");

textbox = document.getElementById("rawd");
textbox.focus();
textbox.setSelectionRange(13, 13);

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

if (localStorage.getItem("History") != undefined) {
  try {
    prevmsgs = JSON.parse(localStorage.getItem("History")).prevmsgs;
  }
  catch {
    localStorage.setItem('History', JSON.stringify({
      prevmsgs: []
    }));
  }
}
else {
  localStorage.setItem('History', JSON.stringify({
    prevmsgs: []
  }));
}

if (localStorage.getItem("Name") != undefined && localStorage.getItem("Name") != "undefined" && localStorage.getItem("Name") != "Unknown") name = localStorage.getItem("Name");
else {
  var span = document.createElement("span");
  span.setAttribute("style", "color: GRAY;");
  span.setAttribute("id", "unnamedreminder");

  var text = document.createTextNode("Type \"/name <name>\" to name yourself");
  span.appendChild(text);

  document.getElementById("chathistory").appendChild(span);

  var br = document.createElement("br");
  br.setAttribute("id", "unnamedreminderbr");
  document.getElementById("chathistory").appendChild(br);
}

var onmsg = prevmsgs.length;

socket.on("auth", function() {
  logs = document.getElementById("log");
  chathistory = document.getElementById("chathistory");
  igchathistory = document.getElementById("igchathistory");

  if (prevauth) {
    for (var i = 0; i < 40; i++) logs.appendChild(document.createElement("br"));

    {
      let span = document.createElement("span");

      span.setAttribute("style", "color: WHITE;");

      span.appendChild(document.createTextNode("> [The Bot Client is restarting]"));

      logs.appendChild(span);
    }

    {
      let span = document.createElement("span");
      
      span.setAttribute("style", "color: RED;");

      span.appendChild(document.createTextNode("The Bot has restarted"));

      if (!igfirstmsg) igchathistory.appendChild(document.createElement("br"));
      else igfirstmsg = false;

      igchathistory.appendChild(span);
      igchathistory.appendChild(document.createElement("br"));
    }

    {
      let span = document.createElement("span");
      
      span.setAttribute("style", "color: RED;");

      span.appendChild(document.createTextNode("The Bot has restarted"));

      if (!firstmsg) chathistory.appendChild(document.createElement("br"));
      else firstmsg = false;

      chathistory.appendChild(span);
      chathistory.appendChild(document.createElement("br"));
    }

    if (document.getElementById("asc").checked) logs.scrollTop = logs.scrollHeight;
  }
  socket.emit("auth", [name, localStorage.getItem("Pass"), !prevauth]);
  prevauth = true;
});

socket.on("log", function(log) {
  if(log[1].startsWith("CHAT")) {
    log[1] = log[1].split("CHAT")[1];
    chathistory = document.getElementById("igchathistory");
    if (igfirstmsg) igfirstmsg = false;
    else chathistory.appendChild(document.createElement("br"));

    var span = document.createElement("span");

    if (log[1] != "") {
      //span.setAttribute("style", `color: ${log[1]};`);
      if (log[1] == "RED" || log[1] == "GREEN") span.setAttribute("style", "color: LIGHT" + log[1] + ";");
      else if (log[1] == "PURPLE") span.setAttribute("style", "color: ORCHID;");
      else span.setAttribute("style", "color: " + log[1] + ";");
    }
    else span.setAttribute("style", "color: GRAY;");

    span.innerHTML = log[0];

    chathistory.appendChild(span);
    chathistory.appendChild(document.createElement("br"));
    if (document.getElementById("igchatasc").checked) chathistory.scrollTop = chathistory.scrollHeight;
    return;
  }
  var span = document.createElement("span");

  if (log[1] != "") {
    //span.setAttribute("style", `color: ${log[1]};`);
    if (log[1] == "RED" || log[1] == "GREEN") span.setAttribute("style", "color: LIGHT" + log[1] + ";");
    else if (log[1] == "PURPLE") span.setAttribute("style", "color: ORCHID;");
    else span.setAttribute("style", "color: " + log[1] + ";");
  }
  else span.setAttribute("style", "color: GRAY;");

  span.innerHTML = log[0];

  logs = document.getElementById("log");
  logs.appendChild(document.createElement("br"));
  logs.appendChild(span);

  if (document.getElementById("asc").checked) logs.scrollTop = logs.scrollHeight;
});

socket.on("chat", function (msg) {
  chathistory = document.getElementById("chathistory");
  
  if (firstmsg) firstmsg = false;
  else chathistory.appendChild(document.createElement("br"));

  var span = document.createElement("span");

  if (msg[0] == "") {
    span.setAttribute("style", "color: YELLOW;");
    span.appendChild(document.createTextNode(msg[1]));
  }
  else {
    span.setAttribute("style", "color: WHITE;");
    span.appendChild(document.createTextNode(`${msg[0]}: ${msg[1]}`));
  }

  chathistory.appendChild(span);
  chathistory.appendChild(document.createElement("br"));
  if (document.getElementById("chatasc").checked) chathistory.scrollTop = chathistory.scrollHeight;
});

socket.on("clr", function(log) {
  document.getElementById("log").innerHTML = "";
  var span = document.createElement("span");
  span.setAttribute("style", "color: WHITE;");

  var text = document.createTextNode("> [BOT_OF_LAW Web Console]");
  span.appendChild(text);

  logs = document.getElementById("log");
  logs.appendChild(span);

  if (document.getElementById("asc").checked) logs.scrollTop = logs.scrollHeight;
});

socket.on("ai", function(ai) {
  aibuttons.forEach(aibutton => aibutton.checked = false);
  aibuttons[ai - 1].checked = true;
});

socket.on("cpu", function(info) {
  document.getElementById("cpu").innerHTML = `CPU: ${info}`;
});

socket.on("ram", function(info) {
  document.getElementById("ram").innerHTML = `RAM: ${info}`;
});

socket.on("usr", function(info) {
  document.getElementById("usr").innerHTML = `Connected Users: ${info}`;
});

socket.on("users", function(users) {
  chathistory = document.getElementById("chathistory");

  if (firstmsg) firstmsg = false;
  else chathistory.appendChild(document.createElement("br"));

  var span = document.createElement("span");

  span.setAttribute("style", "color: LIGHTGREEN;");
  span.appendChild(document.createTextNode(`Connected (${users.length}): ${users.join(", ")}`));
  
  chathistory.appendChild(span);
  chathistory.appendChild(document.createElement("br"));
  if (document.getElementById("chatasc").checked) chathistory.scrollTop = chathistory.scrollHeight;
});

function asc() {
  if (document.getElementById("asc").checked) {
    logs = document.getElementById("log");
    logs.scrollTop = logs.scrollHeight;
  }
}

function igchatasc() {
  if (document.getElementById("igchatasc").checked) {
    igchathistory = document.getElementById("igchathistory");
    igchathistory.scrollTop = igchathistory.scrollHeight;
  }
}

function chatasc() {
  if (document.getElementById("chatasc").checked) {
    chathistory = document.getElementById("chathistory");
    chathistory.scrollTop = chathistory.scrollHeight;
  }
}

for (var i = 0; i < aibuttons.length; i++) {
  aibuttons[i].addEventListener('change', function(e) {
    e.preventDefault();
    socket.emit("ai", parseInt(this.value));
    return false;
  });
}

function hideinfo() {
  if (document.getElementById("hideinfo").checked) Array.from(document.getElementsByClassName("info")).forEach(info => info.hidden = true)
  else Array.from(document.getElementsByClassName("info")).forEach(info => info.hidden = false);
}

document.getElementById("raw").addEventListener("submit", function(e) {
  e.preventDefault();
  textbox = document.getElementById("rawd");
  if (prevmsgs[prevmsgs.length - 1] != textbox.value) {
    prevmsgs.push(textbox.value);
    if (prevmsgs.length == 100) prevmsgs.shift();
    localStorage.setItem('History', JSON.stringify({
      prevmsgs: prevmsgs
    }));
  }
  onmsg = prevmsgs.length;
  socket.emit("raw", textbox.value);
  textbox.value = "{\"command\": \"\", \"data\": \"\"}";
  textbox.focus();
  textbox.setSelectionRange(13, 13);
  cur = 0;
  return false;
});

document.getElementById("chatbox").addEventListener("submit", function(e) {
  e.preventDefault();
  textbox = document.getElementById("chatboxsbox");
  chathistory = document.getElementById("chathistory");
  if (textbox.value.toLowerCase().startsWith("/name")) {
    try {
      if (textbox.value.split(/ (.+)/)[1] != undefined && textbox.value.split(/ (.+)/)[1].replace(/\s/g, '').length) {
        name = textbox.value.split(/ (.+)/)[1].trim();
        socket.emit("name", name);
        localStorage.setItem('Name', name);
        if (document.getElementById("unnamedreminder") != undefined) {
          document.getElementById("unnamedreminder").remove();
        }
        if (document.getElementById("unnamedreminderbr") != undefined) {
          document.getElementById("unnamedreminderbr").remove();
        }
      }
      else throw undefined;
    }
    catch {
      document.getElementById("chathistory").appendChild(document.createElement("br"));
      var span = document.createElement("span");
      span.setAttribute("style", "color: GRAY;");

      var text = document.createTextNode("Command Error: \"/name <name>\"");
      span.appendChild(text);

      chathistory.appendChild(span);
      
      document.getElementById("chathistory").appendChild(document.createElement("br"));

      if (document.getElementById("chatasc").checked) {
        chathistory.scrollTop = chathistory.scrollHeight;
      }
    }
  }
  else if (textbox.value.toLowerCase().startsWith("/clr")) {
    document.getElementById("chathistory").innerHTML = "";
    firstmsg = true;
  }
  else if (textbox.value.toLowerCase().startsWith("/connected")) socket.emit("cons");
  else if (textbox.value != "") socket.emit("chat", [name, textbox.value]);
  textbox.value = "";
  return false;
});

document.getElementById("igchatbox").addEventListener("submit", function(e) {
  e.preventDefault();
  textbox = document.getElementById("igchatboxsbox");
  chathistory = document.getElementById("igchathistory");
  if (textbox.value.toLowerCase().startsWith("/clr")) {
    document.getElementById("igchathistory").innerHTML = "";
    firstmsg = true;
  }
  else if (textbox.value != "") socket.emit("raw", `{\"command\": \"chat\", \"data\": \"${textbox.value} ~${name}\"}`);
  textbox.value = "";
  return false;
});

document.getElementById("rawd").addEventListener("keydown", function(e) {
  if (onmsg === prevmsgs.length) curvalue = this.value;
  if (e.key == "Tab") {
    e.preventDefault();
    curquote = 0;
    lastquoteloc = 0;
    for (var i = 0; i < this.value.length; i++) {
      if (this.value[i] == "\"") {
        curquote++;
        lastquoteloc = i;
      }
      if (curquote === 4 && cur === 1) {
        this.setSelectionRange(i, i);
        cur = 0;
        return;
      }
    }
    this.setSelectionRange(lastquoteloc, lastquoteloc);
    cur = 1;
  }
  if (e.key == "ArrowUp") {
    e.preventDefault();
    if(onmsg != 0) {
      cur = 0;
      onmsg--;
      this.value = prevmsgs[onmsg];
      curquote = 0;
      for (var i = 0; i < this.value.length; i++) {
        if (this.value[i] == "\"") curquote++;
        if (curquote === 4) {
          this.setSelectionRange(i, i);
          return;
        }
      }
    }
  }
  if (e.key == "ArrowDown") {
    e.preventDefault();
    if(onmsg != prevmsgs.length - 1) {
      if (prevmsgs[onmsg + 1] == undefined) { return; }
      cur = 0;
      onmsg++;
      this.value = prevmsgs[onmsg];
      curquote = 0;
      for (var i = 0; i < this.value.length; i++) {
        if (this.value[i] == "\"") {
          curquote++;
        }
        if (curquote === 4) {
          this.setSelectionRange(i, i);
          return;
        }
      }
    }
    else if (onmsg == prevmsgs.length - 1) {
      cur = 0;
      onmsg++;
      textbox = document.getElementById("rawd");
      textbox.value = curvalue;
      curquote = 0;
      for (var i = 0; i < this.value.length; i++) {
        if (this.value[i] == "\"") {
          curquote++;
        }
        if (curquote === 4) {
          this.setSelectionRange(i, i);
          return;
        }
      }
    }
  }
});

document.getElementById("rawd").addEventListener("keyup", function (e) {
  if(this.value === "") {
    this.value = "{\"command\": \"\", \"data\": \"\"}";
    textbox.setSelectionRange(13, 13);
  }
});