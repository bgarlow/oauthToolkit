const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');
const config = require('../config.js');
const jws = require('jws');
const jwk2pem = require('pem-jwk').jwk2pem;

const cachedJwks = {};    // cache the JWK from Okta the first time, so we don't have to retrieve it on subsequent token validation

const OktaJwtVerifier = require('@okta/jwt-verifier');


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

  res.clearCookie(token_type);

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
 * Revoke token by ID
 */
router.delete('/tokens/:authServerId/:clientId/:tokenId', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const authServerId = req.params.authServerId;
  const clientId = req.params.clientId;
  const tokenId = req.params.tokenId
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/api/v1/authorizationServers/${authServerId}/clients/${clientId}/tokens/${tokenId}`;
  const options = {
    uri: endpoint,
    method: 'DELETE',
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
      if (response.statusCode === 204) {
        //const tokenArray = JSON.parse(response.body);
        res.json(response);
      }
    }
  });
});

/**
 * Get token by ID
 */
router.get('/tokens/:authServerId/:clientId/:tokenId', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const authServerId = req.params.authServerId;
  const clientId = req.params.clientId;
  const tokenId = req.params.tokenId
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/api/v1/authorizationServers/${authServerId}/clients/${clientId}/tokens/${tokenId}`;
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
        const tokenArray = JSON.parse(response.body);
        res.json(response.body)
      } else {
        console.error(response.statusCode);
        res.json(response);
      }
    }
  });
});


/**
 * Get a list of tokens for an Auth Server & Client
 */
router.get('/tokens/:authServerId/:clientId', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const expand = req.query['expand'];

  const authServerId = req.params.authServerId;
  const clientId = req.params.clientId;
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  let endpoint = `${baseUrl}/api/v1/authorizationServers/${authServerId}/clients/${clientId}/tokens`;

  if (expand === 'scope') {
    endpoint += '?expand=scope';
  }

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
        const tokenArray = JSON.parse(response.body);
        res.json(response.body)
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
 * Get a single client by ID
 */
router.get('/clients/:clientId', (req, res) => {

  const clientId = req.params.clientId;

  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/oauth2/v1/clients/${clientId}`;
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
 * Store tokens in a cookie to preserve state between page refreshes
 */
router.put('/tokenstorage', (req, res) => {

  const token = req.body.token;
  const tokenType = req.body.token_type;

   res.cookie(tokenType, token);
   res.status(200).send();
});

/*
* return the specified token type from cookie
*/
router.get('/tokenstorage/:token_type', (req, res) => {

  const tokenType = req.params['token_type'];

  switch(tokenType) {
    case 'access_token':
      res.json(req.cookies.access_token);
      break;
    case 'id_token':
      res.json(req.cookies.id_token);
      break;
    case 'refresh_token':
      res.json(req.cookies.refresh_token);
  }
});

/*
 * delete specified token type from cookie
 */
router.delete('/tokenstorage/:token_type', (req, res) => {

  const tokenType = req.params.token_type;

  res.clearCookie(tokenType);
  res.status(200).send();
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
 * Handle the redirect from our OAuth app in Okta.
 */
router.get('/authorization-code/callback', (req, res) => {

  const secret = new Buffer(`${req.cookies.state.selectedOAuthClientId}:${req.cookies.state.unsafeSelectedClientSecret}`, 'utf8').toString('base64');

  let nonce;
  let state;

  if (!req.query == {}) {
    res.redirect(`/toolkit#error=Unknown error in redirect from authorization server. Check Okta system log.`);
    return;
  }

  if (req.query.error) {
    res.redirect(`/toolkit#error=${req.query.error}&error_description=${req.query.error_description}`);
    return;
  }

  // Before initiating the /token request, validate that the users's state and nonce matches what we expect.
  // The client sends a state parameter to Okta in the /authorize request, and sets these cookies for validation here on the server side.

  if (req.cookies['okta-oauth-nonce'] && req.cookies['okta-oauth-state']) {
    nonce = req.cookies.state.nonce;
    state = req.cookies.state.state;
  } else {
    console.log('GET /api/authorization-code/callback error: "state" and "nonce" cookies have not been set before the /authcode/callback request');
    res.redirect(`/toolkit#error=${'Cookie error'}&error_description=${'state and nonce cookies have not been set before the /authcode/callback request'}`);
    return;
  }

  // If we don't have an authorization code, we can't request tokens

  if (!req.query.code) {
    res.redirect(`/toolkit#error=Authorization Code Missing`);
    return;
  }

  /*
  if (!req.query.fromLogin || !req.query.fromLogin == true) {
    if (!req.query.state || req.query.state != state) {
      console.log('/callback state does not match');
      res.redirect(`/toolkit#error=${'state error'}&error_description='Query state ${req.query.state} does not match cookie state ${state}`);
      return;
    }
  }
  */

  // Build the token request
  const scopes = req.cookies.state.selectedScopes.join(' ');
  const payload = {
    grant_type: req.cookies.state.selectedGrantType,
    code: req.query.code,
    client_id: req.cookies.state.selectedOAuthClientId,
    client_secret: req.cookies.state.unsafeSelectedClientSecret,
    redirect_uri: req.cookies.state.selectedRedirectUri,
    scopes: scopes,
    state: req.cookies.state.state,
    nonce: req.cookies.state.nonce
  };

  const query = querystring.stringify(payload);
  const endpoint = `${req.cookies.state.baseUrl}/oauth2/${req.cookies.state.selectedAuthServerId}/v1/token`;

  const options = {
    url: endpoint,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    form: payload
  };

  console.log('Callback token url: ' + options.url);

  // Request token(s)
  request(options, (err, tokenRes, json) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    if (json.error) {
      res.redirect(`/toolkit#error=${json.error}: ${json.error_description}`);
      return;
    }

    /*
     * Use Okta's okta-jwt-verifier to validate the tokens we receive. Okta-jwt-verify checks the signature, expiration date, and in the case of access token
     * checks any claims we configure
     */

    const issuer = req.cookies.state.baseUrl + '/oauth2/' + req.cookies.state.selectedAuthServerId;

    const oktaAccessTokenVerifier = new OktaJwtVerifier({
      issuer: issuer,
      assertClaims: {
        cid: req.cookies.state.selectedOAuthClientId
      }
    });

    const oktaIdTokenVerifier = new OktaJwtVerifier({
      issuer: issuer,
      assertClaims: {
      }
    });

   if (json.refresh_token) {
      res.cookie('refresh_token', json.refresh_token);
    }

    if (json.access_token) {
      oktaAccessTokenVerifier.verifyAccessToken(json.access_token)
        .then(jwt => {
          // the token is valid
          console.log(jwt.claims);
          res.cookie('access_token', json.access_token);
          if (json.id_token) {
            // yeah, weird that the function is called verifyAccessToken. It works for ID token as well.
            oktaIdTokenVerifier.verifyAccessToken(json.id_token)
              .then(jwt => {
                // the token is valid
                console.log(jwt.claims);
                res.cookie('id_token', json.id_token);
                res.redirect(302, '/toolkit');
              })
              .catch(err => {
                res.redirect(`/toolkit#error=${err}.`);
              });
          } else {
            res.redirect(302, '/toolkit');
          }
        })
        .catch(err => {
          console.log(err);
          // a validation failed, inspect the error
          res.redirect(`/toolkit#error=${err}.`);
          return;
        });
    }

    if (!json.access_token && json.id_token) {
      oktaIdTokenVerifier.verifyAccessToken(json.id_token)
        .then(jwt => {
          // the token is valid
          console.log(jwt.claims);
          res.cookie('id_token', json.id_token);
          res.redirect(302, '/toolkit');
        })
        .catch(err => {
          res.redirect(`/toolkit#error=${err}.`);
        });
    }
   });
});

/**
 * Expose the API routes
 */
module.exports = router;
