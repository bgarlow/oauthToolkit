const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');
const config = require('../config.js');

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



router.post('/token', (req, res) => {
  if (!req.cookies.state.selectedOAuthClientId ) {
    console.log('Missing client ID from state cookie.');
    res.status(500).send('Missing client ID from state cookie.');
    return;
  }

  if (!req.cookies.state.selectedAuthServerId) {
    console.log('Missing Auth Server ID.');
    res.status(500).send('Missing Auth Server ID.');
    return;
  }

  const payload = req.body;

  const options = {
    uri: req.cookies.state.baseUrl + '/oauth2/' + req.cookies.state.selectedAuthServerId + '/v1/token',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    form: payload
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
        res.json(response);
      }
    }
  });
});


/**
 * OLD VERSION all Okta /token endpoint with configuration info from demo toolkit (not the app itself)
 */
router.post('/tokenx', (req, res) => {
   //Instead of using Basic auth, we're going to pass client id and client secret (even if it's empty) as form parameters. That's how we can get a token from a SPA app (that doesn't have a client secret
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
router.post('/apps/:appId', (req, res) => {
  const appId = req.params.appId;
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/api/v1/apps/${appId}`;

  const options = {
    uri: endpoint,
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Authorization': 'SSWS ' + apiKey
    },
    json: req.body
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
        res.json(response);
      }
    }
  });
});

/**
 * *** OLD ABOUT VRERSION
 * Get app Client by ID
 */
router.get('/apps/:appId', (req, res) => {
  const appId = req.params.appId;
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;

  const options = {
    uri: `${baseUrl}/api/v1/apps/${appId}`,
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
 * *** OLD ABOUT VERSION
 * Get app by ID
 */
router.post('/getApp', (req, res) => {
  const apiKey = req.cookies.state.unsafeApiKey;
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
 * retrieve user info from /userinfo endpoint using access token
 */
router.post('/userinfo', (req, res) => {

  if (!req.cookies.state.selectedAuthServerId) {
    console.log('Missing Auth Server ID.');
    res.status(500).send('Missing Auth Server ID.');
    return;
  }

  if (!req.body.token) {
    console.log('Missing access token');
    res.status(500).send('Missing access token');
    return;
  }

  const token = req.body.token;
  const options = {
    uri: req.cookies.state.baseUrl + '/oauth2/' + req.cookies.state.selectedAuthServerId + '/v1/userinfo',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Authorization': 'Bearer ' + token
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

  }
);

/**
 * Revoke the provided token
 */
router.post('/revoke', (req, res) => {

  if (!req.cookies.state.selectedOAuthClientId ) {
    console.log('Missing client ID from state cookie.');
    res.status(500).send('Missing client ID from state cookie.');
    return;
  }

  if (!req.cookies.state.selectedAuthServerId) {
    console.log('Missing Auth Server ID.');
    res.status(500).send('Missing Auth Server ID.');
    return;
  }

  const token = req.body.token;
  const token_type = req.body.token_type;

  const payload = {
    token: token,
    token_type_hint: token_type,
    client_id: req.cookies.state.selectedOAuthClientId,
    client_secret: req.cookies.state.unsafeSelectedClientSecret
  };

  const options = {
    uri: req.cookies.state.baseUrl + '/oauth2/' + req.cookies.state.selectedAuthServerId + '/v1/revoke',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    form: payload
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
        res.json(response);
      }
    }
  });
});

/**
 * call Okta's introspect endpoint
 */
router.post('/introspect', (req, res) => {

  if (!req.cookies.state.selectedOAuthClientId ) {
    console.log('Missing client ID from state cookie.');
    res.status(500).send('Missing client ID from state cookie.');
    return;
  }

  if (!req.cookies.state.selectedAuthServerId) {
    console.log('Missing Auth Server ID.');
    res.status(500).send('Missing Auth Server ID.');
    return;
  }

  const token = req.body.token;
  const token_type = req.body.token_type;

  const payload = {
    token: token,
    token_type_hint: token_type,
    client_id: req.cookies.state.selectedOAuthClientId,
    client_secret: (req.cookies.state.unsafeSelectedClientSecret) ? req.cookies.state.unsafeSelectedClientSecret : ''
  };

  const options = {
    uri: req.cookies.state.baseUrl + '/oauth2/' + req.cookies.state.selectedAuthServerId + '/v1/introspect',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    form: payload
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
router.get('/authorizationServers', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/api/v1/authorizationServers`;
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
      res.status(500).send(error);
      return;
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
 * if there are OAuth clients stored in a cookie, return those
 */
router.get('/cachedClients', (req, res) => {
    res.send(req.cookies.cachedClients);
});

// cache OAuth clients
router.put('/cachedClients', (req, res) => {
  let cachedClients = [];
  let cachedClient = {};

  for (let client of req.body) {
    cachedClient = {
      client_id: client.client_id,
      client_secret: client.client_secret ? client.client_secret : ''
    };

    cachedClients.push(cachedClient);
  }

  res.cookie('cachedClients', cachedClients);
  res.status(200).send();
});

// delete cached clients from clients cookie
router.delete('/cachedClients', (req, res) => {
    res.clearCookie('cachedClients');
    res.status(200).send();
});

/**
 * Get a list of authorization servers
 */
router.get('/clients', (req, res) => {

  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/oauth2/v1/clients`;
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
    res.state(500).send('State variable not found in request body.');
    return;
  }
  res.cookie('state', req.body.state);
  res.json({ok:true});
});

/**
 * return state
 */
router.get('/state', (req, res) => {
  res.json(req.cookies.state)
});

/**
 * clear the state cookie
 */
router.delete('/state', (req, res) => {
  res.clearCookie('state');
  res.status(200).send();
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
