const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function id() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function roomPayload(room) {
  return {
    id: room.id,
    title: room.title,
    provider: room.provider,
    content: room.content,
    public: room.public,
    users: room.clients.size
  };
}

function broadcastPublicRooms() {
  const list = [...rooms.values()]
    .filter(r => r.public && r.clients.size > 0)
    .map(roomPayload);
  const msg = JSON.stringify({ type: "public-rooms", rooms: list });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

function removeClientFromRoom(ws) {
  const roomId = ws.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;
  room.clients.delete(ws);
  ws.roomId = null;
  if (room.clients.size === 0) rooms.delete(roomId);
  else {
    const msg = JSON.stringify({
      type: "room-state",
      room: roomPayload(room),
      users: room.clients.size
    });
    for (const c of room.clients) if (c.readyState === 1) c.send(msg);
  }
  broadcastPublicRooms();
}

wss.on("connection", ws => {
  ws.on("message", raw => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }

    if (data.type === "list-public") {
      ws.send(JSON.stringify({
        type: "public-rooms",
        rooms: [...rooms.values()].filter(r => r.public && r.clients.size > 0).map(roomPayload)
      }));
      return;
    }

    if (data.type === "create-room") {
      removeClientFromRoom(ws);
      const room = {
        id: id(),
        title: String(data.title || "Sala Namaguederaz").slice(0, 100),
        provider: String(data.provider || "web"),
        content: data.content || "",
        public: data.public !== false,
        clients: new Set()
      };
      rooms.set(room.id, room);
      room.clients.add(ws);
      ws.roomId = room.id;
      ws.send(JSON.stringify({ type: "room-created", room: roomPayload(room) }));
      broadcastPublicRooms();
      return;
    }

    if (data.type === "join-room") {
      removeClientFromRoom(ws);
      const room = rooms.get(String(data.roomId || "").toUpperCase());
      if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Sala não encontrada ou já encerrada." }));
        return;
      }
      room.clients.add(ws);
      ws.roomId = room.id;
      ws.send(JSON.stringify({ type: "room-joined", room: roomPayload(room) }));
      for (const c of room.clients) {
        if (c !== ws && c.readyState === 1) {
          c.send(JSON.stringify({ type: "room-state", room: roomPayload(room), users: room.clients.size }));
        }
      }
      broadcastPublicRooms();
      return;
    }

    if (data.type === "leave-room") {
      removeClientFromRoom(ws);
      return;
    }

    if (data.type === "room-event") {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const event = JSON.stringify({
        type: "room-event",
        event: data.event,
        from: ws.roomId
      });
      for (const c of room.clients) {
        if (c !== ws && c.readyState === 1) c.send(event);
      }
    }
  });

  ws.on("close", () => removeClientFromRoom(ws));
});

app.get("/health", (_req, res) => res.json({ ok: true, app: "Namaguederaz" }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Namaguederaz rodando na porta ${PORT}`);
});
