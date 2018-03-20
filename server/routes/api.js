const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');

/* GET api listing. */
router.get('/', (req, res) => {
  res.send('Application APIs. Need to document...');
});

module.exports = router;
