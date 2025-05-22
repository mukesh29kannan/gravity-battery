const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

let sensorData = {
  temp: 0,
  humidity: 0,
  current: 0,
  relay: false
};

let controlSettings = {
  start: false,
  maxTemp: 0,
  timerSeconds: 0
};

let timerInterval = null;

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

app.post('/api/sensor-data', (req, res) => {
  sensorData = req.body;
  console.log('Updated sensor data:', sensorData);

  // Auto shutoff if temp exceeds max
  if (controlSettings.maxTemp && sensorData.temp >= controlSettings.maxTemp) {
    controlSettings.start = false;
  }

  res.sendStatus(200);
});

app.get('/api/sensor-data', (req, res) => {
  console.log
  res.json({...sensorData,temp:sensorData.temp-25});
});

app.get('/api/control', (req, res) => {
  res.json(controlSettings);
});

app.post('/api/control', (req, res) => {
  const { start, maxTemp, timerSeconds } = req.body;
  if (start !== undefined) controlSettings.start = start;
  if (maxTemp !== undefined) controlSettings.maxTemp = ( maxTemp || 0) +25;
  if (timerSeconds !== undefined) {
    controlSettings.timerSeconds = timerSeconds;
    if (timerInterval) clearInterval(timerInterval);
    if (timerSeconds > 0) {
      timerInterval = setInterval(() => {
        controlSettings.timerSeconds--;
        if (controlSettings.timerSeconds <= 0) {
          controlSettings.start = false;
          clearInterval(timerInterval);
        }
      }, 1000);
    }
  }

  console.log('Updated control settings:', controlSettings);
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

