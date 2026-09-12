const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get("/", (req, res) => {
  res.json({
    app: "Mana",
    status: "online"
  });
});

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  socket.on("join", (user) => {
    socket.user = user;
    console.log(`${user} joined`);
  });

  socket.on("message", (data) => {

    io.emit("message", {
      user: data.user,
      text: data.text,
      time: new Date().toISOString()
    });

  });

  socket.on("typing", (data) => {

    socket.broadcast.emit("typing", {
      user: data.user,
      typing: data.typing
    });

  });

  socket.on("seen", (data) => {

    socket.broadcast.emit("seen", {
      user: data.user
    });

  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Mana server running on port ${PORT}`);
});
