const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');
const config = require('../config.js');
const jws = require('jws');
const jwk2pem = require('pem-jwk').jwk2pem;

const cachedJwks = {};    // cache the JWK from Okta the first time, so we don't have to retrieve it on subsequent token validation


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

router.put('/tokenstorage', (req, res) => {

  const token = req.body.token;
  const tokenType = req.body.token_type;

   res.cookie(tokenType, token);
   res.status(200).send();
});

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
 * Handle the redirect from our OAuth app in Okta. We'll do some verify that the state and nonce match what we are expecting,
 * exchange our access token for an id_token and access_token, and do some intensive local validation on the id_token. We'll be
 * validating the acess token on each route change in the Angular app (using Route Guard), so we don't necessarily need to
 * validate it here. We just want to estalish that the user is authenticated via a valid id_token.
 */
router.get('/authorization-code/callback', (req, res) => {

  const secret = new Buffer(`${req.cookies.state.selectedOAuthClientId}:${req.cookies.state.unsafeSelectedClientSecret}`, 'utf8').toString('base64');

  // ************** short circuit *******************
  //console.log('Here we go....');
  //res.redirect('/login');
  //return;
  // ************** short circuit *******************

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

  // Before initiating the /token request, validate that the users's state matches what we expect.
  // The client sends a state parameter to Okta in the /authorize request, and sets these cookies for validation here on the server side.

  if (req.cookies['okta-oauth-nonce'] && req.cookies['okta-oauth-state']) {

    nonce = req.cookies.state.nonce;
    state = req.cookies.state.state;

    // nonce = req.cookies['okta-oauth-nonce'];
    // state = req.cookies['okta-oauth-state'];
  } else {
    console.log('GET /api/authorization-code/callback error: "state" and "nonce" cookies have not been set before the /authcode/callback request');
    //res.status(401).send('"state" and "nonce" cookies have not been set before the /authcode/callback request');
    res.redirect(`/toolkit#error=${'Cookie error'}&error_description=${'state and nonce cookies have not been set before the /authcode/callback request'}`);
    return;
  }

  if (!req.query.fromLogin || !req.query.fromLogin == true) {
    if (!req.query.state || req.query.state != state) {
      console.log('/callback state does not match');
      res.redirect(`/toolkit#error=${'state error'}&error_description='Query state ${req.query.state} does not match cookie state ${state}`);
      return;
    }
  }

  if (!req.query.code) {
    res.redirect(`/toolkit#error=Authorization Code Missing`);
    return;
  }

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
    // client_id: req.cookies.state.selectedOAuthClientId,
    // client_secret: req.cookies.state.unsafeSelectedClientSecret
    // ******** hardcoded ***********
    //scope: 'openId profile email' // <----- am I doing that right?
  };

  const query = querystring.stringify(payload);

  //const endpoint = `https://${config.oktaConfig.oktaTenant}.${config.oktaConfig.oktaDomain}/oauth2/${req.cookies.state.selectedAuthServerId}/v1/token?${query}`
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
      //res.status(500).send(err);
      return;
    }

    /* TODO - if we were going to break this out, here's where we'd do it..we have access to our tokens here */


    // Decode the id_token locally to:
    // 1. Verify that it is a JWT
    // 2. Decode the header, whic contains the public key id (kid) we can use to verify the id_token signature.
    const decoded = jws.decode(json.id_token);
    if (!decoded) {
      res.redirect('/toolkit#error=id_token could not be decoded from response.');
      return;
    }

    new Promise((resolve, reject) => {
      // If we've already cached this JWK, return it
      if (cachedJwks[decoded.header.kid]) {
        resolve(cachedJwks[decoded.header.kid]);
        return;
      }

      // if it's not in the cache, get the latest JWKS from /oauth2/v1/keys
      const options = {
        url: `${req.cookies.state.baseUrl}/oauth2/${req.cookies.state.selectedAuthServerId}/v1/keys`,
        json: true
      };

      request(options, (err, resp, json) => {
        if (err) {
          reject(err);
          return;
        } else if (json.error) {
          reject(json);
          return;
        }

        json.keys.forEach(key => cachedJwks[key.kid] = key);
        if (!cachedJwks[decoded.header.kid]) {
          res.redirect('/toolkit#error=No public key for the returned id_token.');
          return;
        }

        resolve(cachedJwks[decoded.header.kid]);
      });
    })
      .then((jwk) => {
        const claims = JSON.parse(decoded.payload);

        // Using the jwk, verify that the id_token signature is valid. In this case, we're using he JWS library, which requires PEM encoding the JWK.
        const pem = jwk2pem(jwk);
        if (!jws.verify(json.id_token, jwk.alg, pem)) {
          res.status(401).send('id_token signature not valid.');
          return;
        }

        // Verify that the nonce matches the nonce generated on the client side
        if (nonce != claims.nonce) {
          res.status(401).send(`claims.nonce "${claims.nonce}" does not match cookie nonce ${nonce}`);
          return;
        }

        const authServerUrl = req.cookies.state.baseUrl + '/oauth2/' + req.cookies.state.selectedAuthServerId;
        // Verify that the issuer is Okta, and specifically the endpoint we performed the authorization against
        if (authServerUrl != claims.iss) {
          res.redirect(`/toolkit#error=id_token issuer "${claims.iss}" does not match our issuer ${authServerUrl}`);
          return;
        }

        // Verify that the id_token was minted specifically for our clientId
        if (req.cookies.state.selectedOAuthClientId != claims.aud) {
          res.redirect(`/toolkit#error=id_token aud "${claims.aud}" does not match our clientId ${req.cookies.state.selectedOAuthClientId}`);
          return;
        }

        // Verify that the token has not expired. It is also important to account for clock skew in the event that this server or the Okta authorization server has drifted.
        const now = Math.floor(new Date().getTime() / 1000);
        const maxClockSkew = 300; // 5 min
        if (now - maxClockSkew > claims.exp) {
          const date = new Date(claims.exp * 1000);
          res.redirect(`/toolkit#error=The JWT expired and is no longer valid - claims.exp ${claims.exp}, ${date}`);
          return;
        }

        // Verify that the token was not issued in the future (accounting for clock skew).
        if (claims.iat > (now + maxClockSkew)) {
          res.redirect(`toolkit#The JWT was issued in the future - iat ${claims.iat}`);
          return;
        }

        // The id_token is good!
        /*
        req.session.user = {
          email: claims.email,
          claims
        };
        */

        // TODO: need to add cookie config to make these HTTP only cookies
        res.cookie('id_token', json.id_token);
        res.cookie('access_token', json.access_token);

        console.log('****************** Tokens received and validated *******************');

        // Now that the session cookie is set, we can navigate to the logged-in landing page.
        res.redirect(302, '/toolkit');

      })
      .catch(err => res.status(500).send(`Error! -> ${JSON.stringify(err)}`));

  });
});


/**
 * Expose the API routes
 */
module.exports = router;
