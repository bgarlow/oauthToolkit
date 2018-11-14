const express = require('express');
const router = express.Router();
//const request = require('request');

const request = require('request').defaults({
  strictSSL: true,
  rejectUnauthorized: true
});

const querystring = require('querystring');
const config = require('../config.js');
//const jws = require('jws');
//const jwk2pem = require('pem-jwk').jwk2pem;
const crypto = require('crypto');
const cachedJwks = {};    // cache the JWK from Okta the first time, so we don't have to retrieve it on subsequent token validation

const OktaJwtVerifier = require('@okta/jwt-verifier');

let tokenPayload;
let proxyPayload;
let sessionPayload;

let baseUrl;
let authServerId;
let clientId;
let clientSecret;
let scope;
let grantType;
let responseType;
let zredirectUri;
let state;
let nonce;

/* GET api listing. */
router.get('/', (req, res) => {
  res.send('DEMO API. Need to update this with endpoint listing.');
});


/* return HTML version of README.md markdown */
router.get('/readme', (req, res) => {

  const fs = require('fs');
  const doAsync = require('doasync');

  doAsync(fs).readFile('README.md', 'utf8')
    .then((data) => {
      var showdown  = require('showdown'),
        converter = new showdown.Converter(),
        text = data,
        html= converter.makeHtml(text);

      jsonResponse = {
        html: html
      };

      res.json(jsonResponse);

    });
});

router.post('/config', (req, res) => {
  let demoConfig = req.body('config');
  res.cookie('demo-config', demoConfig, { httpOnly : true, secure: false });
  res.status(200).send();
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
 *
 */
router.get('/tokenpayload', (req, res) => {
  res.json(tokenPayload);
});

router.get('/proxypayload', (req, res) => {
  res.json(proxyPayload);
});

router.get('/sessionexchangepayload', (req, res) => {
  res.json(sessionPayload);
});

/**
 *
 */
router.get('/verifier', (req, res) => {
  const verifier = base64URLEncode(crypto.randomBytes(32));
  res.json({"verifier": verifier});
});

/**
 *
 */
router.get('/challenge/:verifier', (req, res) => {
  const verifier = req.params.verifier;
  if (verifier) {
    const challenge = base64URLEncode(sha256(verifier));
    res.json({"challenge": challenge});
  }
  res.json({"error": "missing verifier"});
});


/*
 * Call the /token endpoint
 */
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


/*
 * Proxy the call to the /token endpoint
 */
router.post('/tokenproxy', (req, res) => {

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

  payload['client_secret'] = 'x-AZu0lO5egXdl7Qa_kgNow9_KAxZJUvErYm-M4A';

  proxyPayload = payload;

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
        // TODO: need to validate the ID token here
        res.json(response);
      } else {
        console.error(response.statusCode);
        res.json(response);
      }
    }
  });
});

/**
 * Call the /logout endpoint of the selected auth server
 */
router.post('/logout', (req, res) => {

  const baseUrl = req.cookies.state.baseUrl + '/oauth2/' + req.cookies.state.selectedAuthServerId + '/v1';
  const idToken = req.body.idToken;
  let endpoint = `${baseUrl}/logout?post_logout_redirect_uri=http://localhost:3000/toolkit`;
  if (idToken) {
    endpoint = endpoint + `&id_token_hint=${idToken}`;
  }

  const options = {
    uri: endpoint,
    method: 'GET'
  };

  console.log(`Logout request: ${endpoint}`);

  request(options, function(error, response, body) {
    if (error) {
      console.error(error);
    }
    if (response) {
      console.log(response.body);
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
 * Clear the state and nonce cookies from the /authorize endpoint response
 */
router.get('/clearcookies', (req, res) => {
  res.clearCookie('okta-oauth-state');
  res.clearCookie('okta-oauth-nonce');
  res.clearCookie('okta-oauth-redirect-params');
  res.status(200).send();
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

  console.log(options);

  request(options, function(error, response, body) {
    if (error) {
      console.error(error);
      res.status(500).send(error);
      return;
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
 * Revoke token by ID
 */
router.delete('/tokens/:authServerId/:clientId/:tokenId', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const authServerId = req.params.authServerId;
  const clientId = req.params.clientId;
  const tokenId = req.params.tokenId;
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

/*** consent grants *** /

 /**
 * Revoke grant by ID
 *  /api/v1/users/${userId}/grants/${grantId}
 */
router.delete('/grants/:userId/:grantId', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const userId = req.params.userId;
  const grantId = req.params.grantId;
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/api/v1/users/${userId}/grants/${grantId}`;
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
        res.json(response);
      }
    }
  });
});


 /**
 * Revoke all grants for auth server/client
 *  /api/v1/users/${userId}/clients/${clientId}/grants
 */
router.delete('/allgrants/:userId/:clientId', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const userId = req.params.userId;
  const clientId = req.params.clientId;
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/api/v1/users/${userId}/clients/${clientId}/grants`;
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
        res.json(response);
      }
    }
  });
});

 /**
 * Get a list of grants for an User & Client
 *  /api/v1/users/${userId}/clients/${clientId}/grants
 */
router.get('/grants/:userId/:clientId', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const userId = req.params.userId;
  const clientId = req.params.clientId;
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  let endpoint = `${baseUrl}/api/v1/users/${userId}/clients/${clientId}/grants`;

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
        res.json(response.body)
      } else {
        console.error(response.statusCode);
        res.json(response);
      }
    }
  });
});

/**
 * Revoke all tokens for auth server/client
 */
router.delete('/tokens/:authServerId/:clientId', (req, res) => {

  if (!req.cookies.state) {
    res.status(422).send('No Cookie');
    return;
  }

  const authServerId = req.params.authServerId;
  const clientId = req.params.clientId;
  const apiKey = req.cookies.state.unsafeApiKey;
  const baseUrl = req.cookies.state.baseUrl;
  const endpoint = `${baseUrl}/api/v1/authorizationServers/${authServerId}/clients/${clientId}/tokens`;
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

  res.cookie('cachedClients', cachedClients, { httpOnly : true, secure: false });
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
  const endpoint = `${baseUrl}/oauth2/v1/clients?limit=100`;
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
        res.json(response);
      }
    }
  });
});

/**
 * Set okta-oauth-state cookie if not using Okta sign-in-widget
 */
router.put('/oauthstate', (req, res) => {
  const state = req.body.state;

  res.cookie('okta-oauth-state', state, { httpOnly : true, secure: false });
  res.status(200).send();
});

/**
 * Set okta-oauth-nonce cookie if not using Okta sign-in-widget
 */
router.put('/oauthnonce', (req, res) => {
  const nonce = req.body.nonce;

  res.cookie('okta-oauth-nonce', nonce, { httpOnly : true, secure: false });
  res.status(200).send();
});

/**
 * Store tokens in a cookie to preserve state between page refreshes
 */
router.put('/tokenstorage', (req, res) => {

  const token = req.body.token;
  const tokenType = req.body.token_type;

  res.cookie(tokenType, token, { httpOnly : true, secure: false });
  res.status(200).send();
});

/*
* return the specified token type from cookie
*/
router.get('/tokenstorage/:token_type', (req, res) => {

  const tokenType = req.params['token_type'];

  switch(tokenType) {
    case 'access_token':
      if (req.cookies.access_token) {
        res.json(req.cookies.access_token);
      } else {
        res.status(204).send();
      }
      break;
    case 'id_token':
      if (req.cookies.id_token) {
        res.json(req.cookies.id_token);
      } else {
        res.status(204).send();
      }
      break;
    case 'refresh_token':
      if (req.cookies.refresh_token) {
        res.json(req.cookies.refresh_token);
      } else {
        res.status(204).send();
      }
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
  res.cookie('state', req.body.state, { httpOnly : true, secure: false });
  res.status(200).send();
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


router.get('/silentauth', (req, res) => {

  const baseUrl = req.cookies.state.baseUrl;
  //const endpoint = `${baseUrl}/oauth2/v1/clients?limit=100`;
  const endpoint = ` https://btgapi.okta.com/oauth2/aus11dko07fCEDKnV2p7/v1/authorize?client_id=0oa11dnd8y99yf2Te2p7&response_type=code&response_mode=okta_post_message&scope=openid fileshare.role.user&redirect_uri=http://localhost:3000/demo/authorization-code/callback&state=youdidntgivemeastatevalue&nonce=1542152791551`;

  const options = {
    uri: endpoint,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
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
        res.json(response);
      }
    }
  });

});

/**
 *
 */
router.put('/decodedtokens', (req, res) => {
  if (!req.body.tokens) {
    res.state(500).send('Tokens variable not found in request body.');
    return;
  }
  res.cookie('decodedtokens', req.body.tokens, { httpOnly : true, secure: false });
  res.status(200).send();
});

router.get('/decodedtokens', (req, res) => {
  res.json(req.cookies.decodedtokens);
});

router.delete('/decodedtokens', (req, res) => {
  res.clearCookie('decodedtokens');
  res.status(200).send();
});
/**
 * Return a list of cookies
 */
router.get('/cookies', (req, res) => {
  res.json(req.cookies);
});


/**
 *
 */
router.post('/authn', (req, res) => {

  const username = req.body.username;
  const password = req.body.password;
  const relayState = (req.body.relayState) ? req.body.relayState : undefined;
  const endpoint = `${req.cookies.state.baseUrl}/api/v1/authn`;

  this.baseUrl = req.cookies.state.baseUrl;
  this.authServerId = req.cookies.state.selectedAuthServerId;
  this.clientId = req.cookies.state.selectedOAuthClientId;
  this.clientSecret = req.cookies.state.unsafeSelectedClientSecret;
  this.zRedirectUri = req.cookies.state.selectedRedirectUri;
  this.scope = req.cookies.state.selectedScopes.join(' ');
  let responseTypes = [];
  for (let rt of req.cookies.state.selectedResponseType) {
    if (rt.selected === true) {
      responseTypes.push(rt.type);
    }
  }
  this.responseType = responseTypes.join(' ');
  this.grantType = req.cookies.state.selectedGrantType;
  this.state = req.cookies.state.state;
  this.nonce = req.cookies.state.nonce;

  const payload = {
    username: username,
    password: password,
    options: {
      multiOptionalFactorEnroll: false,
      warnBeforePasswordExpired: false
    }
  };

  const options = {
    url: endpoint,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    json: payload
  };

  request(options, (error, response, body) => {
    if (error) {
      console.error(error);
    }
    if (response) {
      if (response.statusCode === 200) {
        const sessionToken = response.body.sessionToken;

        // exchange sessionToken for authorization code
        //https://btgapi.okta.com/oauth2/aus11dko07fCEDKnV2p7/v1/authorize?client_id=0oa11dnd8y99yf2Te2p7&response_type=code&scope=profile openid&redirect_uri=http://localhost:port/demo/authorization-code/callback&state=youdidntgivemeastatevalue&nonce=1536330360190
        const authenticateEndpoint = `${this.baseUrl}/oauth2/${this.authServerId}/v1/authorize?sessionToken=${sessionToken}&client_id=${this.clientId}&response_type=${this.responseType}&scope=${this.scope}&redirect_uri=${this.zRedirectUri}&state=abracadabra&nonce=bracacrabra&prompt=none`;
        const authorizeOptions = {
          uri: authenticateEndpoint,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          }
        };

        sessionPayload = authenticateEndpoint;

        request(authorizeOptions, function(authError, authResponse, authBody) {
          if (authError) {
            console.error(authError);
          }
          if (authResponse) {
            if (authResponse.statusCode !== 200) {
              res.send(authResponse);
              return;
            }

            if (authResponse.statusCode === 200) {
              if (typeof authBody === 'string') {
                json = JSON.parse(authBody);
              }

              if (json.id_token) {
                res.cookie('id_token', json.id_token, { httpOnly : true, secure: false });
              }

              if (json.access_token) {
                res.cookie('access_token', json.access_token, { httpOnly : true, secure: false });
              }

              if (json.refresh_token) {
                res.cookie('refresh_token', json.refresh_token, { httpOnly : true, secure: false });
              }

              let authnResponse = {
                statusCode: 200,
                status: 'ok',
                body: {
                  msg: 'Successfully exchanged session token for access token'
                }
              };

              res.json(authnResponse);
            } else {
              console.error(authResponse.statusCode);
              res.send(authResponse);
            }
          }
        });

      } else {
        console.error(response.statusCode);
        res.json(response);
      }
    }
  });
});

/**
 *
 */
router.get('/authn/callback', (req, res) => {

  if (!req.query.code) {
    console.log(`/toolkit#error=Authorization Code Missing`);
  }

  // Build the token request
   let payload;

    payload = {
      grant_type: this.grantType,
      code: req.query.code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.zRedirectUri,
      scopes: this.scope,
      state: this.state,
      nonce: this.nonce
    };

  tokenPayload = payload;

  const query = querystring.stringify(payload);
  const endpoint = `${this.baseUrl}/oauth2/${this.authServerId}/v1/token`;

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

  // Request token(s)
  request(options, (err, tokenRes, json) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    if (tokenRes.statusCode !== 200) {
      res.status(500).send(json);
      return;
    }
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    if (json.error) {
      console.log(`${json.error}: ${json.error_description}`);
      return;
    }

    //res.json(json);
    res.cookie('id_token', json.id_token, { httpOnly : true, secure: false });
    res.redirect(302, '/toolkit');
  });
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

  let payload;

  if (req.cookies.state.usePKCE) {
    payload = {
      grant_type: req.cookies.state.selectedGrantType,
      code: req.query.code,
      code_verifier: req.cookies.state.codeVerifier,
      client_id: req.cookies.state.selectedOAuthClientId,
      redirect_uri: req.cookies.state.selectedRedirectUri,
      scopes: scopes,
      state: req.cookies.state.state,
      nonce: req.cookies.state.nonce
    };
  } else {
    payload = {
      grant_type: req.cookies.state.selectedGrantType,
      code: req.query.code,
      client_id: req.cookies.state.selectedOAuthClientId,
      client_secret: req.cookies.state.unsafeSelectedClientSecret,
      redirect_uri: req.cookies.state.selectedRedirectUri,
      scopes: scopes,
      state: req.cookies.state.state,
      nonce: req.cookies.state.nonce
    };
  }

  tokenPayload = payload;

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
  console.log(options);

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
      clientId: req.cookies.state.selectedOAuthClientId
    });

    const oktaIdTokenVerifier = new OktaJwtVerifier({
      issuer: issuer,
      clientId: req.cookies.state.selectedOAuthClientId
    });

    if (json.refresh_token) {
      res.cookie('refresh_token', json.refresh_token, { httpOnly : true, secure: false });
    }

    // This block is temporary, until I fix the invalid leaf problem //
    /*
    if (json.access_token) {
      res.cookie('access_token', json.access_token, {httpOnly: true, secure: false});
    }
    if (json.id_token) {
      res.cookie('id_token', json.id_token, { httpOnly : true, secure: false });
    }
    res.redirect(302, '/toolkit');
    // end temporary block
    */


    if (json.access_token) {
      console.log(`access_token follows...`);
      console.log(json.access_token);
      oktaAccessTokenVerifier.verifyAccessToken(json.access_token)
        .then(jwt => {
          // the token is valid
          console.log(jwt.claims);
          res.cookie('access_token', json.access_token, { httpOnly : true, secure: false });
          if (json.id_token) {
            // yeah, weird that the function is called verifyAccessToken. It works for ID token as well.
            oktaIdTokenVerifier.verifyAccessToken(json.id_token)
              .then(jwt => {
                // the token is valid
                console.log(jwt.claims);
                res.cookie('id_token', json.id_token, { httpOnly : true, secure: false });
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
        });
    }

    if (!json.access_token && json.id_token) {
      oktaIdTokenVerifier.verifyAccessToken(json.id_token)
        .then(jwt => {
          // the token is valid
          console.log(jwt.claims);
          res.cookie('id_token', json.id_token, { httpOnly : true, secure: false });
          res.redirect(302, '/toolkit');
        })
        .catch(err => {
          res.redirect(`/toolkit#error=${err}.`);
        });
    }

   });
});

/**
 *
 * @param str
 * @returns {string}
 */
function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 *
 */
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

/**
 * Expose the API routes
 */
module.exports = router;
