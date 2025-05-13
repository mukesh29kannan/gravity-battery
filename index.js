const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
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

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
