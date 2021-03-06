const dotenv = require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());

// Get our API routes
const api = require('./server/routes/api');
const demoApi = require('./server/routes/demo-api');

let  config = {};

// Point static path to dist
app.use(express.static(path.join(__dirname, 'dist')));

app.use('/api', api);
app.use('/demo', demoApi);

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  console.log(`Routing other routes to ${path.join(__dirname, 'dist/index.html')}`);
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const port = process.env.PORT || '3000';
app.set('port', port);

app.listen(port, () => console.log(`Example app running on port  ${port}`));
