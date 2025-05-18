const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const path = require('path');

const app = express();

// Allow all origins explicitly
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.static('public'));

let latestData = {
  distance: 0,
  battery: 0,
  current: 0,
  power: 0
};

let triggerCommand = false;

app.post('/api/data', (req, res) => {
  latestData = req.body;
  console.log('Received data:', latestData);
  res.sendStatus(200);
});

app.get('/api/data', (req, res) => {
  res.json(latestData);
});

app.get('/api/trigger', (req, res) => {
  const command = triggerCommand ? '1' : '0';
  triggerCommand = false;
  res.send(command);
});

app.post('/api/trigger', (req, res) => {
  triggerCommand = true;
  res.send('Triggered');
});

app.get('/prob', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'indextwo.html');
  console.log("Sending file from path:", filePath);
  res.sendFile(filePath, err => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(404).send('Page not found');
    }
  });
});

const server = app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

const wss = new WebSocket.Server({ server, path: '/ws' });

let espSocket = null;

wss.on('connection', socket => {
  console.log('Client connected');

  socket.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      // Broadcast to web clients
      wss.clients.forEach(client => {
        if (client !== socket && client.readyState === WebSocket.OPEN)
          client.send(msg);
      });
    } catch (e) {
      // Message is a command from web app
      if (socket !== espSocket && espSocket) espSocket.send(msg);
    }

    // Save ESP32 socket
    if (!espSocket && msg.includes("temp")) {
      espSocket = socket;
    }
  });

  socket.on('close', () => {
    if (socket === espSocket) espSocket = null;
  });
});
