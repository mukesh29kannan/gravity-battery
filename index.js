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
  console.log('WebSocket client connected');

  socket.on('message', msg => {
    try {
      const data = JSON.parse(msg);

      // If it contains sensor data, assume it's from ESP
      if (data.temp !== undefined || data.humidity !== undefined || data.current !== undefined) {
        if (!espSocket) espSocket = socket;

        // Broadcast to all clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
          }
        });

        console.log('Data from ESP32:', data);
      } else {
        // If it's not ESP data, maybe a control message from web app
        if (espSocket && espSocket.readyState === WebSocket.OPEN) {
          espSocket.send(msg);
          console.log('Control message sent to ESP32:', msg);
        }
      }

    } catch (e) {
      console.error('Invalid message received:', msg);
    }
  });

  socket.on('close', () => {
    if (socket === espSocket) {
      espSocket = null;
      console.log('ESP32 disconnected');
    } else {
      console.log('Web client disconnected');
    }
  });
});
