const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
  console.log('controller connected', socket.id);

  socket.on('move', dir => {
    console.log('[server] move', dir);
    io.emit('move', dir); // broadcast to all clients
  });

  socket.on('look', dir => {
    console.log('[server] look', dir);
    io.emit('look', dir);
  });

  // Hold start/stop events
  socket.on('move_start', dir => {
    console.log('[server] move_start', dir);
    io.emit('move_start', dir);
  });
  socket.on('move_stop', dir => {
    console.log('[server] move_stop', dir);
    io.emit('move_stop', dir);
  });
  socket.on('look_start', dir => {
    console.log('[server] look_start', dir);
    io.emit('look_start', dir);
  });
  socket.on('look_stop', dir => {
    console.log('[server] look_stop', dir);
    io.emit('look_stop', dir);
  });

  socket.on('disconnect', () => console.log('controller disconnected', socket.id));
});

server.listen(4000, () => console.log('controller at http://localhost:4000'));
