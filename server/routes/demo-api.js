const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');

const apiKey = '00Ke1kv3EbZfEW03MQ3G-9fbcYnduE0tShwBxnI02J';

/* GET api listing. */
router.get('/', (req, res) => {
  res.send('DEMO API. Need to update this with endpoint listing.');
});

router.post('/config', (req, res) => {
  let demoConfig = req.body('config');
  res.cookie('demo-config', demoConfig, { httpOnly : true }).send('Configuration saved to cookie.');
});

router.get('/config', (req, res) => {
  res.json(req.cookies);
});

/**
 * call Okta /token endpoint with configuration info from demo toolkit (not the app itself)
 */
router.post('/token', (req, res) => {
  console.log(req.body);
  const secret = new Buffer(`${req.body.clientId}:${req.body.clientSecret}`, 'utf8').toString('base64');
  const authHeader = `Basic ${secret}`;

  const payload = {
    'grant_type': 'client_credentials',
    'scope': req.body.scope
  };

  const options = {
    url: req.body.endpoint,
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: payload
  };

  request(options, function(error, response, body) {
    if (error) {
      console.error(`/token ${error}`);
    }
    if (response) {
      if (response.statusCode === 200) {
        res.json(response);
      } else {
        console.error(`/token ${response.statusCode}`);
        res.send(response);
      }
    }
  })
});

/**
 * Call the /logout endpoint of the selected auth server
 */
router.post('/logout', (req, res) => {

});



module.exports = router;
