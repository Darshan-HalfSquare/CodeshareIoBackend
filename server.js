require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const users = {};

const VideCallUser = {};

const socketToRoom = {};

io.on("connection", (socket) => {
  socket.on("join room", (roomID) => {
    if (users[roomID]) {
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
    socket.emit("all users", usersInThisRoom);
  });

  socket.on("start Video call", (roomID) => {
    if (VideCallUser[roomID]) {
      const length = VideCallUser[roomID].length;
      if (length === 4) {
        socket.emit("room full");
        return;
      }
      VideCallUser[roomID].push(socket.id);
    } else {
      VideCallUser[roomID] = [socket.id];
    }
    const usersInThisRoom = VideCallUser[roomID].filter(
      (id) => id !== socket.id
    );
    socket.emit("all users", usersInThisRoom);
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("receive dataText", (payload) => {
    users[payload.room].map((item) => {
      io.to(item).emit("send dataTextValue", {
        message: payload.data,
      });
    });
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = VideCallUser[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      VideCallUser[roomID] = room;
    }
    socket.broadcast.emit("user left", socket.id);
  });
});

server.listen(process.env.PORT || 8000, () =>
  console.log("server is running on port 8000")
);
