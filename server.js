const dotenv = require('dotenv').config();
const express = require('express');
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

console.log(`Okta tenant:  ${process.env.OKTA_TENANT}`);

app.use('/api', api);
app.use('/demo', demoApi);

app.listen(3000, () => console.log('Example app running on port 3000'));
