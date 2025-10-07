// controller/server.js
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// allow your game page to connect
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// serve the phone UI
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", socket => {
  console.log("controller connected");

  // phone D-pad -> game movement
  socket.on("move", dir => {
    console.log("move:", dir);
    io.emit("move", dir); // broadcast to all game clients
  });

  // phone look -> game look
  socket.on("look", dir => {
    console.log("look:", dir);
    io.emit("look", dir); // broadcast to all game clients
  });

  socket.on("disconnect", () => console.log("controller disconnected"));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`controller running at http://localhost:${PORT}`);
});
