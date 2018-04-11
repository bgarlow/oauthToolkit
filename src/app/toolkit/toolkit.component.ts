import {Component, OnInit} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import {ActivatedRoute} from '@angular/router';
import {ToolkitService} from '../services/toolkit.service';

@Component({
  selector: 'app-toolkit',
  templateUrl: './toolkit.component.html',
  styleUrls: ['./toolkit.component.css']
})

export class ToolkitComponent implements OnInit {

  toolkit: ToolkitService;
  showAppProfile = false;
  errorMessage;
  successMessage;
  metadataResponse;
  responseMessage;
  responseMessageTitle;

  getUserInfo(token) {
    this.toolkit.getUserInfo(token)
      .subscribe(
        data => {
          if (data['statusCode'] === 200) {
            this.responseMessage = JSON.parse(data.body.toString());
            this.responseMessageTitle = "Response from /userinfo endpoint"
          } else {
            this.errorMessage = data;
          }
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * revokeToken
   * @param token
   * @param tokenType
   */
  revokeToken(token, tokenType) {
    this.toolkit.revokeToken(token, tokenType)
      .subscribe(
        data => {
          this.responseMessage = `${tokenType} revoked`;
          this.responseMessageTitle = `/revoke response for ${tokenType}`;

          switch (tokenType) {
            case 'access_token':
              this.toolkit.accessToken = undefined;
              this.toolkit.decodedAccessToken = undefined;
              break;
            case 'id_token':
              this.toolkit.idToken = undefined;
              this.toolkit.decodedIdToken = undefined;
              break;
          }

          this.saveState()
            .subscribe(
              data => {
                history.pushState('', document.title, window.location.pathname);
                this.responseMessage = data;
              },
              error => {
                this.errorMessage = error;
              }
            )
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * Validate the token
   */
  introspectToken(token, tokenType) {
    this.toolkit.introspectToken(token, tokenType)
      .subscribe(
        data => {
          this.responseMessage = JSON.parse(data.toString());
          this.responseMessageTitle = `/introspect response for ${tokenType}`;
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * Get token from token endpoing
   */
  getToken() {
    //this.clearLocalTokens();
    this.toolkit.getToken()
      .subscribe(
        data => {
          if (data['statusCode'] === 200) {
            let token = JSON.parse(data['body']);
            this.toolkit.accessToken = token.access_token;
            this.toolkit.decodedAccessToken = this.toolkit.parseJwt(this.toolkit.accessToken);
            this.toolkit.userScopes = (this.toolkit.decodedAccessToken[this.toolkit.scopesClaim]) ? this.toolkit.decodedAccessToken[this.toolkit.scopesClaim] : undefined;
            if (this.toolkit.supportedScopes) {
              this.toolkit.getMaxScopeSet();
            }
          } else {
            console.log(data);
            this.errorMessage = data;
          }
        }
      );
  }

  /**
   * call metadata endpoint and optionally display the value
   * @param authServer
   * @param display
   */
  getAuthServerMetadata(authServer, display) {
    this.toolkit.getMetadata(authServer)
      .subscribe(
        data => {
          this.toolkit.supportedScopes = data['scopes_supported'];
          if (display) {
            this.metadataResponse = data;
          }
        }
      );
  }

  /**
   * Selected auth server
   */
  selectAuthServer(authServer) {
    this.toolkit.selectedAuthServerId = authServer.id;
    this.toolkit.selectedAuthServer = authServer;
    this.getAuthServerMetadata(authServer, false);
    this.saveState()
      .subscribe(
        data => {
          this.responseMessage = this.toolkit.selectedAuthServer;
          this.responseMessageTitle = 'Selected Authorization Server';
          this.toolkit.updateAuthorizeUrl();
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * @param oauthClient
   */
  selectOAuthClient(oauthClient) {
    this.toolkit.selectedOAuthClientId = oauthClient.client_id;
    this.toolkit.selectedOAuthClient = oauthClient;
    this.getSelectedApp();
    this.toolkit.selectedAppProfile = undefined;

    if (this.toolkit.selectedGrantType) {
      this.toolkit.selectedGrantType = oauthClient.grant_types[0];
    }

    if (!this.toolkit.selectedRedirectUri) {
      this.toolkit.selectedRedirectUri = oauthClient.redirect_uris[0];
    }

    this.toolkit.selectedResponseType = [];
    for (let type of oauthClient.response_types) {
      this.toolkit.selectedResponseType.push({
        type: type,
        selected: true
      });
    }



    this.saveState()
      .subscribe(
        data => {
          this.responseMessage = this.toolkit.selectedOAuthClient;
          this.responseMessageTitle = 'Selected OAuth 2.0 client';
          this.toolkit.updateAuthorizeUrl();
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * Check to see if the current response_type is one of the selected types
   * @param type
   * @returns {any}
   */
  isSelectedType(type) {
    const keys = Object.keys(this.toolkit.selectedResponseType);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (this.toolkit.selectedResponseType[key].type === type) {
        return this.toolkit.selectedResponseType[key].selected;
      }
    }
    return false;
  }

  /**
   * Handle selecting and or deselecting UI options
   */
  selectResponseType(type) {
    const keys = Object.keys(this.toolkit.selectedResponseType);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (this.toolkit.selectedResponseType[key].type === type) {
        this.toolkit.selectedResponseType[key].selected = !this.toolkit.selectedResponseType[key].selected;
      }
    }
    this.toolkit.updateAuthorizeUrl();
  }

  selectGrantType(grantType) {
    this.toolkit.selectedGrantType = grantType;
    this.toolkit.updateAuthorizeUrl();
  }

  selectRedirectUri(redirectUri) {
    this.toolkit.selectedRedirectUri = redirectUri;
    this.toolkit.updateAuthorizeUrl();
  }

  selectScope(scope) {
    const scopeArray = (this.toolkit.selectedScopes) ? this.toolkit.selectedScopes : [];
    if (!scopeArray.includes(scope)) {
      scopeArray.push(scope);
    } else {
      const index = scopeArray.indexOf(scope);
      if (index > -1) {
        scopeArray.splice(index, 1);
      }
    }
    this.toolkit.selectedScopes = scopeArray;
    this.toolkit.updateAuthorizeUrl();
  }

  /**
   * TODO: move this into toolkit service
   * update the OAuth client app
   * @param app
   */
  updateAppProfile(oauthClient) {

    const profile = JSON.parse(this.toolkit.selectedAppProfile);
    this.toolkit.selectedApp.profile = profile;

    this.http.post('/demo/apps/' + oauthClient.client_id, this.toolkit.selectedApp)
      .subscribe(
        data => {
          if (data['statusCode'] === 200) {
            this.successMessage = data['body'];
          }
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * TODO: refactor this to call getSelectedApp
   * Get the selected app's profile attribute
   * @param app
   */
  getAppProfile(app) {
    this.showAppProfile = !this.showAppProfile;

    if (this.showAppProfile === false ) {
      return;
    }

    this.http.get('/demo/apps/' + app.client_id)
      .subscribe(
        data => {
          this.toolkit.selectedApp = JSON.parse(data['body'].toString());
          this.toolkit.selectedAppProfile = this.toolkit.selectedApp.profile ? JSON.stringify(this.toolkit.selectedApp.profile, undefined, 2) : JSON.stringify({}, undefined, 2);
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * Set the app and app profile based on the App that corrresponds with the selected OAuth client
   */
  getSelectedApp() {
    this.toolkit.getSelectedApp()
      .subscribe(
        data => {
          this.toolkit.selectedApp = JSON.parse(data['body'].toString());
          this.toolkit.selectedAppProfile = this.toolkit.selectedApp.profile ? JSON.stringify(this.toolkit.selectedApp.profile, undefined, 2) : JSON.stringify({}, undefined, 2);
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * post our current state variables to node back end, stuff them in a cookie
   */
  saveState(): Observable<any> {

    const payload = {
      state: {
        baseUrl: this.toolkit.baseUrl,
        unsafeApiKey: this.toolkit.unsafeApiKey,
        selectedAuthServerId: this.toolkit.selectedAuthServerId,
        selectedOAuthClientId: this.toolkit.selectedOAuthClientId,
        selectedScopes: this.toolkit.selectedScopes,
        selectedResponseType: this.toolkit.selectedResponseType,
        selectedGrantType: this.toolkit.selectedGrantType,
        nonce: this.toolkit.nonce,
        state: this.toolkit.state,
        scopesClaim: this.toolkit.scopesClaim,
        selectedRedirectUri: this.toolkit.selectedRedirectUri,
        idToken: this.toolkit.idToken,
        decodedIdToken: this.toolkit.decodedIdToken,
        accessToken: this.toolkit.accessToken,
        decodedAccessToken: this.toolkit.decodedAccessToken
      }
    };

    return this.http.put('/demo/state', payload);
  }

  /**
   * Retrieve toolkit state from cookie
   */
  loadState() {
    this.http.get('/demo/state')
      .subscribe(
        data => {
          this.toolkit.baseUrl = (data['baseUrl']) ? data['baseUrl'] : undefined;
          this.toolkit.unsafeApiKey = (data['unsafeApiKey']) ? data['unsafeApiKey'] : undefined;
          this.toolkit.selectedAuthServerId = (data['selectedAuthServerId']) ? data['selectedAuthServerId'] : undefined; // this.toolkit.authorizationServers[0];
          this.toolkit.selectedOAuthClientId = (data['selectedOAuthClientId']) ? data['selectedOAuthClientId'] : undefined; // this.toolkit.oAuthClients[0];
          this.toolkit.selectedScopes = (data['selectedScopes']) ? data['selectedScopes'] : this.toolkit.selectedScopes;
          this.toolkit.selectedGrantType = (data['selectedGrantType']) ? data['selectedGrantType'] : undefined; // this.toolkit.oAuthClients[0].grant_types[0];
          this.toolkit.selectedResponseType = (data['selectedResponseType']) ? data['selectedResponseType'] : undefined; // this.toolkit.oAuthClients[0].response_types[0];
          this.toolkit.selectedRedirectUri = (data['selectedRedirectUri']) ? data['selectedRedirectUri'] : undefined; // this.toolkit.oAuthClients[0].redirect_uris[0];
          this.toolkit.state = (data['state']) ? data['state'] : undefined;
          this.toolkit.nonce = (data['nonce']) ? data['nonce'] : undefined;
          this.toolkit.scopesClaim = (data['scopesClaim']) ? data['scopesClaim'] : undefined;
          this.toolkit.idToken =  (data['idToken']) ? data['idToken'] : undefined;
          this.toolkit.decodedIdToken =  (data['decodedIdToken']) ? data['decodedIdToken'] : undefined;
          this.toolkit.accessToken =  (data['accessToken']) ? data['accessToken'] : undefined;
          this.toolkit.decodedAccessToken =  (data['decodedAccessToken']) ? data['decodedAccessToken'] : undefined;

          this.toolkit.updateAuthorizeUrl();
          if (this.toolkit.selectedAuthServerId) {
            this.getAuthServerMetadata(this.toolkit.selectedAuthServerId, false);
          }
        },
        error => {
          console.log(error);
        }
      );
  }

  // Utility functions

  authenticate() {
    this.saveState()
      .subscribe(
        data => {
          this.toolkit.authenticate();
        },
      error => {
          this.errorMessage = error;
      });
  }

  /**
   * Extract tokens from URL fragment on redirect from Okta
   * @param fragment
   */
  extractTokensFromFragment(fragment) {
    let queryParams = {};
    const fragmentArray = fragment.split('&');

    for (let item of fragmentArray) {
      const tmp = item.split('=');
      queryParams[tmp[0]] = tmp[1];
    }
    if (queryParams['error']) {
      this.errorMessage = queryParams;
      return;
    }

    if (queryParams['id_token']) {
      this.toolkit.idToken = queryParams['id_token'];
      this.toolkit.decodedIdToken = this.toolkit.parseJwt(this.toolkit.idToken);
    }

    if (queryParams['access_token']) {
      this.toolkit.accessToken = queryParams['access_token'];
      this.toolkit.decodedAccessToken = this.toolkit.parseJwt(this.toolkit.accessToken);
    }

    // re-save our state with the new tokens
    this.saveState()
      .subscribe(
        data => {
          console.log('State saved in extractTokensFromFragment');
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * get the selected auth server object by ID
   */
  mapSelectedAuthServer() {
    for (let authServer of this.toolkit.authorizationServers) {
      if (authServer.id === this.toolkit.selectedAuthServerId) {
        this.toolkit.selectedAuthServer = authServer;
      }
    }
  }

  /**
   *  get the selected oAuth client by ID
   */
  mapSelectedOAuthClient() {
    for (let client of this.toolkit.oAuthClients) {
      if (client.client_id === this.toolkit.selectedOAuthClientId) {
        this.toolkit.selectedOAuthClient = client;
      }
    }
  }

  initState() {
    this.toolkit.accessToken = undefined;
    this.toolkit.decodedAccessToken = undefined;
    this.toolkit.idToken = undefined;
    this.toolkit.decodedIdToken = undefined;
    this.toolkit.scopesClaim = undefined;

    this.toolkit.selectedAuthServerId = undefined;
    this.toolkit.selectedOAuthClientId = undefined;
    this.toolkit.selectedGrantType = undefined;
    this.toolkit.selectedResponseType = undefined;
    this.toolkit.selectedScopes = undefined;
    this.toolkit.selectedRedirectUri = undefined;

    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.responseMessage = undefined;
  }

  /**
   * reload page with config from cookie
   */
  reload() {

    // clear current org values
    this.initState();
    this.saveState()
      .subscribe(
        data => {
          this.toolkit.getAuthorizationServers()
            .subscribe(
              data => {
                this.toolkit.authorizationServers = JSON.parse(data.toString());
                this.toolkit.getClients()
                  .subscribe(
                    data => {
                      // TODO: loop through the response and add values to the "new" metaOAuthClients array (which includes client_secret)
                      const clients = JSON.parse(data.toString());
                      for (let client of clients) {
                        client['client_secret'] = '';
                        this.toolkit.oAuthClients.push(client);
                      }
                      //this.toolkit.oAuthClients = JSON.parse(data.toString());
                      this.loadState();
                      this.mapSelectedAuthServer();
                      this.mapSelectedOAuthClient();
                    },
                    error => {
                      console.log(error);
                      this.errorMessage = error;
                    }
                  );
              },
              error => {
                console.log(error);
                this.errorMessage = error;
              }
            );
        },
        error => {
          this.errorMessage = error;
        }
      );
  }



  /*
   * Constructor
   * @param {ActivatedRoute} route
   * @param {HttpClient} http
   */
  constructor(private route: ActivatedRoute, private http: HttpClient, private _toolkit: ToolkitService) {
    this.toolkit = _toolkit;
  }

  /*
   * ngOnInit
   */
  ngOnInit() {

    this.loadState();

    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.responseMessage = undefined;

    this.toolkit.getAuthorizationServers()
      .subscribe(
        data => {
          this.toolkit.authorizationServers = JSON.parse(data.toString());

          this.toolkit.getClients()
            .subscribe(
              data => {
                const clients = JSON.parse(data.toString());
                for (let client of clients) {
                  client['client_secret'] = '';
                  this.toolkit.oAuthClients.push(client);
                }

                this.toolkit.storeClients()
                  .subscribe(
                    data => {
                      this.responseMessage = data;
                    },
                    error => {
                      this.errorMessage = error;
                    }
                  );
                //this.toolkit.oAuthClients = JSON.parse(data.toString());
                this.mapSelectedAuthServer();
                this.mapSelectedOAuthClient();

                // check to see if this is a redirect with tokens
                this.route.fragment.subscribe(
                  fragment => {
                    if (fragment) {
                      this.extractTokensFromFragment(fragment);
                    }
                  }
                );
              }
            );
        },
        error => {
          console.log(error);
        }
      );
    }

}
