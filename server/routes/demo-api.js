const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');
const config = require('../config.js');


const apiKey = config.oktaSecret.oktaApiKey;

/* GET api listing. */
router.get('/', (req, res) => {
  res.send('DEMO API. Need to update this with endpoint listing.');
});

router.post('/config', (req, res) => {
  let demoConfig = req.body('config');
  res.cookie('demo-config', demoConfig, { httpOnly : true }).send('Configuration saved to cookie.');
});

/**
 * return demo configuration info
 * Note: this may return different (unsafe) values than the /api/config endpoint
 */
router.get('/oktaConfig', (req, res) => {
  let demoConfig = {
    oktaConfig: config.oktaConfig,
    authServers: config.authServers,
    oAuthClients: config.oAuthClients
  };

  res.json(demoConfig);
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

/**
 * Update app
 */
router.post('/updateApp', (req, res) => {

  const endpoint = req.body.endpoint;
  const appJson = req.body.appJson;
  const options = {
    uri: endpoint,
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Authorization': 'SSWS ' + apiKey
    },
    json: appJson
  };

  request(options, function(error, response, body) {
    if (error) {
      console.error(error);
    }
    if (response) {
      if (response.statusCode === 200) {
        res.json(response);
      } else {
        console.error(response.statusCode);
        res.send(response);
      }
    }
  });
});

/**
 * Get app by ID
 */
router.post('/getApp', (req, res) => {

  const endpoint = req.body.endpoint;
  const appId = req.body.appId;
  const options = {
    uri: endpoint,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Authorization': 'SSWS ' + apiKey
    }
  };

  request(options, function(error, response, body) {
    if (error) {
      console.error(error);
    }
    if (response) {
      if (response.statusCode === 200) {
        res.json(response);
      } else {
        console.error(response.statusCode);
        res.send(response);
      }
    }
  });
});

/**
 * Get a list of authorization servers
 */
router.get('/authorizationServers', (req, res) => {

  const endpoint = `https://${config.oktaConfig.oktaTenant}.${config.oktaConfig.oktaDomain}/api/v1/authorizationServers`;
  const options = {
    uri: endpoint,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Authorization': 'SSWS ' + apiKey
    }
  };

  request(options, function(error, response, body) {
    if (error) {
      console.error(error);
    }
    if (response) {
      if (response.statusCode === 200) {
        res.json(response.body);
      } else {
        console.error(response.statusCode);
        res.json(response);
      }
    }
  });

});

/**
 * Get a list of authorization servers
 */
router.get('/clients', (req, res) => {

  const endpoint = `https://${config.oktaConfig.oktaTenant}.${config.oktaConfig.oktaDomain}/oauth2/v1/clients`;
  const options = {
    uri: endpoint,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Authorization': 'SSWS ' + apiKey
    }
  };

  request(options, function(error, response, body) {
    if (error) {
      console.error(error);
    }
    if (response) {
      if (response.statusCode === 200) {
        res.json(response.body);
      } else {
        console.error(response.statusCode);
        res.json(response);
      }
    }
  });

});

/**
 * store the current state of the app in our cookie
 */
router.put('/state', (req, res) => {
  if (!req.body.state) {
    res.state(500).send('State variable not found in request body.')
  }
  res.cookie('state', req.body.state);
  res.json({ok:true});
});

/**
 * return state
 */
router.get('/state', (req, res) => {
  if (!req.cookies) {
    res.status(400).send(`Unable to retrieve cookie.`);
    return;
  }

  if (req.cookies.state) {
    res.json(req.cookies.state)
  } else {
    res.status(400).send('Unable to find state cookie.');
  }
});

/**
 * Return a list of cookies
 */
router.get('/cookies', (req, res) => {
  res.json(req.cookies);
});

/**
 * Expose the API routes
 */
module.exports = router;
