const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API de GymFitPro funcionando',
    docs: 'Usa /api/health para probar el backend'
  });
});

app.use('/api', apiRoutes);

module.exports = app;
