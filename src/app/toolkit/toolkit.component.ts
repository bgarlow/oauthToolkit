import {Component, OnInit, ViewChild} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import {ActivatedRoute} from '@angular/router';
import {ToolkitService} from '../services/toolkit.service';
import {JsoneditorComponent} from '../jsoneditor/jsoneditor.component';
import {JsonEditorOptions} from 'ang-jsoneditor';
import {CountDown} from 'ng4-date-countdown-timer';

@Component({
  selector: 'app-toolkit',
  templateUrl: './toolkit.component.html',
  styleUrls: ['./toolkit.component.css']
})

export class ToolkitComponent implements OnInit {

  toolkit: ToolkitService;
  showAppProfile = false;
  showAuthClientTokens = false;
  errorMessage;
  successMessage;
  metadataResponse;
  responseMessage;
  responseMessageTitle;
  collapseAuthServers = false;
  collapseOAuthClients = false;

  @ViewChild('widgetEditor') widgetConfigEditor: JsoneditorComponent;
  public widgetConfigOptions: JsonEditorOptions;

  @ViewChild('profileEditor') appProfileEditor: JsoneditorComponent;
  public profileConfigOptions: JsonEditorOptions;

  /**
   *
   */
  generatePkceStrings() {
    this.toolkit.getCodeVerifier()
      .subscribe(
        data => {
          this.toolkit.codeVerifier = data['verifier'];
          this.toolkit.getCodeChallenge(this.toolkit.codeVerifier)
            .subscribe(
              data => {
                this.toolkit.codeChallenge = data['challenge'];
                this.toolkit.usePKCE = true;
                this.saveState();
              }
            );
        }
      );
  }

  /**
   *
   * @param token
   */
  getUserInfo(token) {
    this.toolkit.getUserInfo(token)
      .subscribe(
        data => {
          if (data['statusCode'] === 200) {
            this.responseMessage = JSON.parse(data.body.toString());
            this.responseMessageTitle = 'Response from /userinfo endpoint';
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
        response => {
          this.toolkit.clearCachedToken(tokenType)
            .subscribe(
              data => {
                this.errorMessage = data;
              },
              error => {
                this.errorMessage = error;
              }
            );
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
            case 'refresh_token':
              this.toolkit.refreshToken = undefined;
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
            );
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
          if (data.statusCode === 401) {
            this.responseMessage = data.body;
          } else {
            this.responseMessage = JSON.parse(data.toString());
          }
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
    this.saveConfig();
    this.errorMessage = undefined;
    this.toolkit.getToken()
      .subscribe(
        data => {
          if (data['statusCode'] === 200) {
            let token = JSON.parse(data['body']);
            this.toolkit.accessToken = token.access_token;

            if (token.refresh_token) {
              this.toolkit.refreshToken = token.refresh_token;
              this.toolkit.introspectToken(this.toolkit.refreshToken, 'refresh_token')
                .subscribe(
                  data => {
                    const introspectResponse = JSON.parse(data);
                    this.toolkit.refreshTokenExp = new Date(introspectResponse.exp * 1000);
                  }
                );
            }

            this.toolkit.parseJwt(this.toolkit.accessToken)
              .subscribe(
                decodedToken => {
                  this.toolkit.decodedAccessToken = decodedToken;
                  this.toolkit.accessTokenExp = new Date(this.toolkit.decodedAccessToken.exp * 1000);
                  this.updateUserScopes();
                  if (this.toolkit.supportedScopes) {
                    this.toolkit.getMaxScopeSet();
                  }
                  this.saveState()
                    .subscribe(
                      data => {
                        console.log('Saved state in getToken()');
                      },
                      error => {
                        this.errorMessage = error;
                      }
                    );
                },
                error => {
                  this.errorMessage = error;
                });
          } else {
            console.log(data);
            this.errorMessage = JSON.parse(data['body']);
          }
        }
      );
  }

  /**
   * meta function to update widget configuration and authorize URL
   */
  updateAuthConfig() {
    this.toolkit.updateAuthorizeUrl();
    if (this.widgetConfigEditor) {  // this won't be displayed if we selected client credentials grant type
      this.widgetConfigEditor.data = this.toolkit.liveWidgetConfig;
    }
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

  getSupportedScopes(authServer) {

    return new Promise(resolve => {
      let scopes;
      this.toolkit.getMetadata(authServer)
        .subscribe(
          data => {
            scopes = data['scopes_supported'];
            resolve(scopes);
          }
        );
    });
  }

  /**
   * update the list of userScopes overlap with auth server scopes, to allow token enrichment
   */
  updateUserScopes() {

    if (this.toolkit.scopesClaim) {

      const scopeClaims = this.toolkit.scopesClaim.split(',');
      const scopeArray = [];
      let scopeSet;
      let currentScope;

      for (let i = 0; i < scopeClaims.length; i++) {
        let currentClaim = scopeClaims[i];
        if (this.toolkit.decodedIdToken) {
          scopeSet = this.toolkit.decodedIdToken[currentClaim];
        } else {
          scopeSet = this.toolkit.decodedAccessToken[currentClaim];
        }
        if (scopeSet) {
          for (let i = 0; i < scopeSet.length; i++) {
            currentScope = scopeSet[i];
            if (!scopeArray.includes(currentScope)) {
              scopeArray.push(currentScope);
            }
          }
        }
      }

      this.toolkit.userScopes = scopeArray;
    }
  }

  /**
   * Selected auth server
   */
  selectAuthServer(authServer) {
    this.toolkit.selectedScopes = undefined;
    this.toolkit.userScopes = undefined;
    this.toolkit.selectedAuthServerId = authServer.id;
    this.toolkit.selectedAuthServer = authServer;
    this.getSupportedScopes(authServer)
      .then(
        supportedScopes => {
          this.toolkit.supportedScopes = supportedScopes;
          this.saveState()
            .subscribe(
              data => {
                this.toolkit.updateAuthorizeUrl();
              },
              error => {
                this.errorMessage = error;
              }
            );
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
    this.toolkit.selectedAppProfile = undefined;
    this.toolkit.selectedOAuthClientId = oauthClient.client_id;
    this.toolkit.selectedOAuthClient = oauthClient;
    this.getSelectedApp();

    if (!this.toolkit.selectedGrantType || !oauthClient.grant_types.includes(this.toolkit.selectedGrantType)) {
      this.toolkit.selectedGrantType = oauthClient.grant_types[0];
    }

    if (!this.toolkit.selectedRedirectUri || !oauthClient.redirect_uris.includes(this.toolkit.selectedRedirectUri)) {
      this.toolkit.selectedRedirectUri = oauthClient.redirect_uris[0];
    }

    this.toolkit.selectedResponseType = [];
    for (let type of oauthClient.response_types) {
      this.toolkit.selectedResponseType.push({
        type: type,
        selected: true
      });
    }

    this.toolkit.usePKCE = (this.toolkit.selectedOAuthClient.application_type === 'native' && this.toolkit.selectedGrantType === 'code') ? true : false;

    this.toolkit.unsafeSelectedClientSecret = oauthClient.client_secret;

    this.saveState()
      .subscribe(
        data => {
          this.updateAuthConfig();
          //this.toolkit.updateAuthorizeUrl();
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
    this.updateAuthConfig();
  }

  /**
   * TODO: move this into toolkit service
   * update the OAuth client app
   * @param app
   */
  updateAppProfile(oauthClient) {

    const profile = this.appProfileEditor.editor.get();
    this.toolkit.selectedApp = profile;

    this.http.post('/demo/apps/' + oauthClient.client_id, this.toolkit.selectedApp)
      .subscribe(
        data => {
          if (data['statusCode'] === 200) {
            this.successMessage = data['body'];
            this.toolkit.selectedApp = data['body'];

            this.http.get('/demo/clients/' + oauthClient.client_id)
              .subscribe(
                data => {
                  const jsonData = JSON.parse(data.toString());
                  this.toolkit.selectedOAuthClient = jsonData;

                  this.toolkit.getClients()
                    .subscribe(
                      clients => {
                        this.toolkit.oAuthClients = JSON.parse(clients.body);
                        this.saveState();
                      }
                    );
                });
          }
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /*
   * TODO: this should be in the toolkit service, not here
   * show tokens
   */
  getTokens() {

    let endpoint = `/demo/tokens/${this.toolkit.selectedAuthServerId}/${this.toolkit.selectedOAuthClientId}`;

    if (this.toolkit.expand) {
        endpoint += '?expand=scope';
    }

    this.http.get(endpoint)
      .subscribe(
        data => {
          this.toolkit.selectedAuthClientTokens = JSON.parse(data.toString());
        }
      );
  }

  /*
  * TODO: this should also be in toolkit service, not here
   */
  revokeTokenById(token) {

    const tokenId = (token.id) ? token.id : token.uid;

    this.http.delete(`/demo/tokens/${this.toolkit.selectedAuthServerId}/${this.toolkit.selectedOAuthClientId}/${tokenId}`)
      .subscribe(
        data => {
          if (data['statusCode'] === 204) {
            this.successMessage = 'Token revoked.';
            this.getTokens();
          }
        }
      );
  }

  revokeAllTokens() {

    this.http.delete(`/demo/tokens/${this.toolkit.selectedAuthServerId}/${this.toolkit.selectedOAuthClientId}`)
      .subscribe(
        data => {
          if (data['statusCode'] === 204) {
            this.successMessage = 'All tokens revoked.';
            this.getTokens();
          }
        }
      );
  }

  /*
 * TODO: this should also be in toolkit service, not here
 */
  getTokenById(token) {
    return this.http.get(`/demo/tokens/${this.toolkit.selectedAuthServerId}/${this.toolkit.selectedOAuthClientId}/${token.id}`);
  }

  /**
   * TODO: refactor this to call getSelectedApp
   * Get the selected app's profile attribute
   * @param app
   */
  getAppProfile(client) {
    this.showAppProfile = !this.showAppProfile;

    if (this.showAppProfile === false ) {
      return;
    }

    this.getSelectedApp();
  }

  /**
   * Set the app and app profile based on the App that corrresponds with the selected OAuth client
   */
  getSelectedApp() {

    if (!this.toolkit.selectedOAuthClient) {
      return undefined;
    }

   this.toolkit.getSelectedApp()
      .subscribe(
        data => {
          this.toolkit.selectedApp = JSON.parse(data['body'].toString());
          if (this.appProfileEditor) {
            this.appProfileEditor.data = this.toolkit.selectedApp;
          }
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   *
   */
  saveConfig() {
    this.saveState()
      .subscribe(
        data => {
          this.toolkit.cacheClients()
            .subscribe(
              data => {
                console.log('State saved and OAuth clients cached.');
              },
              error => {
                this.errorMessage = error;
              }
            );
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
        unsafeSelectedClientSecret: this.toolkit.unsafeSelectedClientSecret,
        selectedScopes: this.toolkit.selectedScopes,
        selectedResponseType: this.toolkit.selectedResponseType,
        selectedGrantType: this.toolkit.selectedGrantType,
        nonce: this.toolkit.nonce,
        state: this.toolkit.state,
        scopesClaim: this.toolkit.scopesClaim,
        selectedRedirectUri: this.toolkit.selectedRedirectUri,
        refreshToken: this.toolkit.refreshToken,
        decodedIdToken: this.toolkit.decodedIdToken,
        decodedAccessToken: this.toolkit.decodedAccessToken,
        refreshTokenExp: this.toolkit.refreshTokenExp,
        codeVerifier: this.toolkit.codeVerifier,
        codeChallenge: this.toolkit.codeChallenge,
        usePKCE: this.toolkit.usePKCE,
        collapseOAuthClients: this.collapseOAuthClients,
        collapseAuthServers: this.collapseAuthServers,
        selectedIdp: this.toolkit.selectedIdp,
        widgetConfig: this.toolkit.liveWidgetConfig
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
          if (data === null) { return };

          this.toolkit.state = (data['state']) ? data['state'] : undefined;
          this.toolkit.nonce = (data['nonce']) ? data['nonce'] : undefined;
          this.updateOauthCookies();
          this.toolkit.baseUrl = (data['baseUrl']) ? data['baseUrl'] : undefined;
          this.toolkit.unsafeApiKey = (data['unsafeApiKey']) ? data['unsafeApiKey'] : undefined;
          this.toolkit.selectedAuthServerId = (data['selectedAuthServerId']) ? data['selectedAuthServerId'] : undefined; // this.toolkit.authorizationServers[0];
          this.toolkit.selectedOAuthClientId = (data['selectedOAuthClientId']) ? data['selectedOAuthClientId'] : undefined; // this.toolkit.oAuthClients[0];
          this.toolkit.unsafeSelectedClientSecret = (data['unsafeSelectedClientSecret']) ? data['unsafeSelectedClientSecret'] : undefined;
          this.toolkit.selectedScopes = (data['selectedScopes']) ? data['selectedScopes'] : this.toolkit.selectedScopes;
          this.toolkit.selectedGrantType = (data['selectedGrantType']) ? data['selectedGrantType'] : undefined; // this.toolkit.oAuthClients[0].grant_types[0];
          this.toolkit.selectedResponseType = (data['selectedResponseType']) ? data['selectedResponseType'] : undefined; // this.toolkit.oAuthClients[0].response_types[0];
          this.toolkit.selectedRedirectUri = (data['selectedRedirectUri']) ? data['selectedRedirectUri'] : undefined; // this.toolkit.oAuthClients[0].redirect_uris[0];
          this.toolkit.scopesClaim = (data['scopesClaim']) ? data['scopesClaim'] : undefined;
          this.toolkit.usePKCE = (data['usePKCE']) ? data['usePKCE'] : undefined;
          this.collapseOAuthClients = (data['collapseOAuthClients']) ? data['collapseOAuthClients'] : false;
          this.collapseAuthServers = (data['collapseAuthServers']) ? data['collapseAuthServers'] : false;
          this.toolkit.selectedIdp = (data['selectedIdp']) ? data['selectedIdp'] : undefined;
          this.toolkit.codeVerifier = (data['codeVerifier']) ? data['codeVerifier'] : undefined;
          this.toolkit.codeChallenge = (data['codeChallenge']) ? data['codeChallenge'] : undefined;
          this.toolkit.liveWidgetConfig = (data['widgetConfig']) ? data['widgetConfig'] : undefined;
          this.toolkit.decodedIdToken =  (data['decodedIdToken']) ? data['decodedIdToken'] : undefined;
          if (this.toolkit.decodedIdToken) {
            this.toolkit.currentUser = (this.toolkit.decodedIdToken.preferred_username) ? this.toolkit.decodedIdToken.preferred_username : this.toolkit.decodedIdToken.sub;
          } else {
            this.toolkit.currentUser = undefined;
          }
          this.toolkit.decodedAccessToken =  (data['decodedAccessToken']) ? data['decodedAccessToken'] : undefined;
          this.toolkit.accessTokenExp = (this.toolkit.decodedAccessToken) ? new Date(this.toolkit.decodedAccessToken.exp * 1000) : undefined;
          this.toolkit.idTokenExp = (this.toolkit.decodedIdToken) ? new Date(this.toolkit.decodedIdToken.exp * 1000) : undefined;
          this.toolkit.refreshTokenExp = (data['refreshTokenExp']) ? data['refreshTokenExp'] : undefined;

          if (this.toolkit.selectedAuthServerId) {
            this.getAuthServerMetadata(this.toolkit.selectedAuthServerId, false);
          }
        },
        error => {
          console.log('No state cookie found.');
        }
      );
  }

  // Utility functions

  /**
   *
   */
  updateOauthCookies() {
    this.http.put('/demo/oauthstate', {'state': this.toolkit.state})
      .subscribe(
        stateResponse => {
          this.http.put('/demo/oauthnonce', {'nonce': this.toolkit.nonce})
            .subscribe(
              nonceResponse => {
                this.toolkit.updateAuthorizeUrl();
              }
            );
        }
      );
  }

  getTokenFromProxy() {

    this.toolkit.getTokenFromProxy()
      .subscribe(
        response => {
          if (response.statusCode === 200) {
            this.toolkit.getProxyPayload()
              .subscribe(
                payload => {
                  this.toolkit.proxyPayload = payload;
                }
              );
            const body = JSON.parse(response.body);

            if (body.id_token) {
              this.toolkit.idToken = body.id_token;

              this.toolkit.parseJwt(this.toolkit.idToken)
                .subscribe(
                  decodedToken => {
                    this.toolkit.decodedIdToken = decodedToken;
                    this.toolkit.currentUser = (this.toolkit.decodedIdToken.preferred_username) ? this.toolkit.decodedIdToken.preferred_username : this.toolkit.decodedIdToken.sub;
                    this.toolkit.idTokenExp = new Date(this.toolkit.decodedIdToken.exp * 1000);
                  },
                  error => {
                    this.errorMessage = error;
                  });

              this.toolkit.cacheToken(this.toolkit.idToken, 'id_token')
                .subscribe(
                  cachedIDToken => {
                    this.successMessage = 'ID Token cached. ';
                  },
                  idTokenError => {
                    this.errorMessage = idTokenError;
                  });
            }

            if (body.access_token) {
              this.toolkit.accessToken = body.access_token;

              this.toolkit.parseJwt(this.toolkit.accessToken)
                .subscribe(
                  decodedToken => {
                    this.toolkit.decodedAccessToken = decodedToken;
                    this.toolkit.accessTokenExp = new Date(this.toolkit.decodedAccessToken.exp * 1000);
                  },
                  error => {
                    this.errorMessage = error;
                  });

              this.toolkit.cacheToken(this.toolkit.accessToken, 'access_token')
                .subscribe(
                  cachedAccesstoken => {
                    this.successMessage += 'Access Token cached. ';
                  },
                  accessTokenError => {
                    this.errorMessage = accessTokenError;
                  });

              if (body.refresh_token) {
                this.toolkit.refreshToken = body.refresh_token;
                this.toolkit.introspectToken(this.toolkit.refreshToken, 'refresh_token')
                  .subscribe(
                    data => {
                      const introspectResponse = JSON.parse(data);
                      this.toolkit.refreshTokenExp = new Date(introspectResponse.exp * 1000);
                    }
                  );
              }

              this.toolkit.cacheToken(this.toolkit.refreshToken, 'refresh_token')
                .subscribe(
                  cachedRefreshToken => {
                    this.successMessage += 'Refresh Token cached. ';
                  },
                  refreshTokenError => {
                    this.errorMessage = refreshTokenError;
                  });

              this.updateUserScopes();
            }

          } else {
            this.errorMessage = response.body;
          }
        });
  }

  /**
   *
   */
  authenticate() {
    this.errorMessage = undefined;
    this.updateOauthCookies();
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
      this.errorMessage = queryParams['error'] + ': ' + queryParams['error_description'];
      return;
    }

    if (queryParams['id_token']) {
      this.toolkit.idToken = queryParams['id_token'];

      this.toolkit.parseJwt(this.toolkit.idToken)
        .subscribe(
          decodedToken => {
            this.toolkit.decodedIdToken = decodedToken;
            this.toolkit.currentUser = (this.toolkit.decodedIdToken.preferred_username) ? this.toolkit.decodedIdToken.preferred_username : this.toolkit.decodedIdToken.sub;
            this.toolkit.idTokenExp = new Date(this.toolkit.decodedIdToken.exp * 1000);
          },
          error => {
            this.errorMessage = error;
          });

      this.toolkit.cacheToken(this.toolkit.idToken, 'id_token')
        .subscribe(
          cachedIDToken => {
            this.successMessage = 'ID Token cached. ';
          },
          idTokenError => {
            this.errorMessage = idTokenError;
          });
    }

    if (queryParams['access_token']) {
      this.toolkit.accessToken = queryParams['access_token'];

      this.toolkit.parseJwt(this.toolkit.accessToken)
        .subscribe(
          decodedToken => {
            this.toolkit.decodedAccessToken = decodedToken;
            this.toolkit.accessTokenExp = new Date(this.toolkit.decodedAccessToken.exp * 1000);
          },
          error => {
            this.errorMessage = error;
          });

      this.toolkit.cacheToken(this.toolkit.accessToken, 'access_token')
        .subscribe(
          cachedAccesstoken => {
            this.successMessage += 'Access Token cached. ';
          },
          accessTokenError => {
            this.errorMessage = accessTokenError;
          });

      if (queryParams['refresh_token']) {
        this.toolkit.refreshToken = queryParams['refresh_token'];
        this.toolkit.introspectToken(this.toolkit.refreshToken, 'refresh_token')
          .subscribe(
            data => {
              const introspectResponse = JSON.parse(data);
              this.toolkit.refreshTokenExp = new Date(introspectResponse.exp * 1000);
            }
          );
        }

      this.toolkit.cacheToken(this.toolkit.refreshToken, 'refresh_token')
        .subscribe(
          cachedRefreshToken => {
            this.successMessage += 'Refresh Token cached. ';
          },
          refreshTokenError => {
            this.errorMessage = refreshTokenError;
          });

      this.updateUserScopes();
    }
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
        this.toolkit.unsafeSelectedClientSecret = client.client_secret;
      }
    }
  }

  loadCachedTokens() {

    this.toolkit.getCachedToken('id_token')
      .subscribe(
        cachedIdToken => {
          if (cachedIdToken) {
            this.toolkit.idToken = cachedIdToken;
            this.toolkit.parseJwt(this.toolkit.idToken)
              .subscribe(
                decodedToken => {
                  this.toolkit.decodedIdToken = decodedToken;
                  this.toolkit.idTokenExp = new Date(decodedToken.exp * 1000);
                  this.toolkit.currentUser = (this.toolkit.decodedIdToken.preferred_username) ? this.toolkit.decodedIdToken.preferred_username : this.toolkit.decodedIdToken.sub;
                },
                error => {
                  this.errorMessage = error;
                });
          }
        },
        idTokenError => {
          this.errorMessage = idTokenError;
        });

    this.toolkit.getCachedToken('access_token')
      .subscribe(
        cachedAccessToken => {
          if (cachedAccessToken) {
            this.toolkit.accessToken = cachedAccessToken;
            this.toolkit.parseJwt(this.toolkit.accessToken)
              .subscribe(
                decodedToken => {
                  this.toolkit.decodedAccessToken = decodedToken;
                  this.toolkit.accessTokenExp = new Date(decodedToken.exp * 1000);

                },
                error => {
                  this.errorMessage = error;
                });
          }
        },
        accesstokenError => {
          this.errorMessage = accesstokenError;
        });

    this.toolkit.getCachedToken('refresh_token')
      .subscribe(
        cachedRefreshToken => {
          if (cachedRefreshToken && cachedRefreshToken != 'undefined') {
            this.toolkit.refreshToken = cachedRefreshToken;
            this.toolkit.introspectToken(this.toolkit.refreshToken, 'refresh_token')
              .subscribe(
                data => {

                  const introspectResponse = JSON.parse(data);
                  if (introspectResponse.active === true) {
                    this.toolkit.refreshTokenExp = new Date(introspectResponse.exp * 1000);
                  } else {
                    this.toolkit.refreshTokenExp = undefined;
                  }
                }
              );
          }
        },
        refreshTokenError => {
          //this.errorMessage = refreshTokenError;
        });
  }

  clearCachedTokens() {
    this.toolkit.clearCachedToken('access_token');
    this.toolkit.clearCachedToken('id_token');
    this.toolkit.clearCachedToken('refresh_token');
  }

  loadConfig() {
    this.loadCachedTokens();
    this.loadState();
  }

  // initialize state variables
  initState() {

    this.toolkit.accessToken = undefined;
    this.toolkit.decodedAccessToken = undefined;
    this.toolkit.refreshToken = undefined;
    this.toolkit.idToken = undefined;
    this.toolkit.decodedIdToken = undefined;
    this.toolkit.scopesClaim = undefined;

    this.toolkit.selectedAuthServerId = undefined;
    this.toolkit.selectedAuthServer = undefined;
    this.toolkit.selectedOAuthClientId = undefined;
    this.toolkit.selectedOAuthClient = undefined;
    this.toolkit.unsafeSelectedClientSecret = undefined;
    this.toolkit.selectedGrantType = undefined;
    this.toolkit.selectedResponseType = undefined;
    this.toolkit.selectedScopes = undefined;
    this.toolkit.selectedRedirectUri = undefined;
    this.toolkit.userScopes = undefined;

    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.responseMessage = undefined;
  }

  /**
   * Render the Okta sign  in widget
   */
  showLogin() {
    this.toolkit.widget.renderEl({el: '#okta-login-container'},
      response => {

        if (response.status === 'IDP_DISCOVERY') {
          response.idpDiscovery.redirectToIdp(this.toolkit.liveWidgetConfig.idpDiscovery.requestContext);
          console.log('Need to redirectWithoutPrompt or call /authorize again with prompt=none');
        }

        if (response.status === 'SUCCESS') {
          //this.toolkit.currentUser = (response[0].claims.name) ? response[0].claims.name : response[0].claims.sub;

          // Normally, we would use token.hasTokensInUrl() and token.parseTokensFromUrl() to extract our tokens. I'm already doing that in the onInit()
          // of the toolkit and stuffing them into cookies, so I don't need to do it here.

          return;
        }
      },
      error => {
        this.errorMessage = error;
    });
  }

  /**
   * reload the widget with the latest config
   */
  updateWidget() {
    this.toolkit.liveWidgetConfig = this.widgetConfigEditor.editor.get();
    this.toolkit.updateWidgetConfig();
    this.saveState()
      .subscribe(
        state => {
          this.showLogin();
        },
        error => {
          this.errorMessage = error;
        });
  }

  /**
   * close widget session
   */
  logout() {
    this.toolkit.signout()
      .subscribe(
          signoutResponse => {
            console.log('signoutResponse:');
            console.log(signoutResponse);
            this.revokeToken(this.toolkit.accessToken, 'access_token');
            this.revokeToken(this.toolkit.refreshToken, 'refresh_token');
            this.toolkit.clearCache();
          });
  }

  /**
   * Restore widget to original configuration
   */
  resetWidget() {
    this.toolkit.updatedWidgetConfig = this.toolkit.originalWidgetConfig;
    this.toolkit.updateAuthorizeUrl();
    this.updateAuthConfig();
    this.toolkit.updateWidgetConfig();
    this.showLogin();
  }

  /**
   * Load (or reload) data from org. If same org, don't wipe out the clients cache. Clear and reebuild the state cache.
   */
  reload() {

    if (!this.toolkit.baseUrl || !this.toolkit.unsafeApiKey) {
      this.errorMessage = 'Please enter Base URL and API key to continue.';
      return;
    }

    this.clearCachedTokens();
    this.initState();
    // save state to add baseUrl and unsafeApiKey to cookie
    this.saveState()
      .subscribe(
        state => {
          this.toolkit.getAuthorizationServers()
            .subscribe(
              authServers => {
                if (authServers.statusCode === 200) {
                  this.toolkit.authorizationServers = JSON.parse(authServers.body);

                  this.toolkit.getClients()
                    .subscribe(
                      clients => {
                        this.toolkit.oAuthClients = JSON.parse(clients.body);
                        this.saveState()
                          .subscribe(
                            state => {
                              console.log('State saved after reload.');
                              this.toolkit.cacheClients()
                                .subscribe(
                                  cached => {
                                    console.log('OAuth clients cached');
                                  },
                                  cacheError => {
                                    this.errorMessage = cacheError;
                                  });
                            },
                            stateError => {
                              this.errorMessage = stateError;
                            });
                      },
                      clientError => {
                        this.errorMessage = clientError;
                      });
                } else {
                  this.errorMessage = JSON.parse(authServers.body.toString());
                }
              },
              authServerError => {
                this.errorMessage = authServerError;
              });
        },
        stateError => {
            this.errorMessage = stateError;
        });


  }

  /*
   * Constructor
   * @param {ActivatedRoute} route
   * @param {HttpClient} http
   */
  constructor(private route: ActivatedRoute, private http: HttpClient, private _toolkit: ToolkitService) {
    this.toolkit = _toolkit;

    this.widgetConfigOptions = new JsonEditorOptions();
    this.widgetConfigOptions.modes = ['code', 'text', 'tree', 'view']; // set all allowed modes
    this.widgetConfigOptions.name = 'widgetConfigEditor';

    this.profileConfigOptions = new JsonEditorOptions();
    this.profileConfigOptions.modes = ['code', 'text', 'tree', 'view']; // set all allowed modes
    this.profileConfigOptions.name = 'appProfileEditor';
  }

  /*
   * ngOnInit
   */
  ngOnInit() {

    this.loadState();
    this.loadCachedTokens();
    this.toolkit.getAuthorizationServers()
      .subscribe(
        authServers => {
          // something went wrong, probably used the wrong API key
          if (authServers.statusCode !== 200) {
            this.errorMessage = JSON.parse(authServers.body);
            return;
          }
          // check to see if this is a redirect with tokens in the URL fragment
          this.route.fragment.subscribe(
            fragment => {
              if (fragment) {
                this.extractTokensFromFragment(fragment);
              } else {
                //if (this.toolkit.decodedIdToken && this.toolkit.scopesClaim) {
                //  this.toolkit.userScopes = (this.toolkit.decodedIdToken[this.toolkit.scopesClaim]) ? this.toolkit.decodedIdToken[this.toolkit.scopesClaim] : undefined;
                //}
                this.updateUserScopes();
              }
            },
            fragmentError => {
              this.errorMessage = fragmentError;
            });


          this.toolkit.authorizationServers = JSON.parse(authServers.body);
          this.toolkit.getClients()
            .subscribe(
              clients => {
                this.toolkit.oAuthClients = JSON.parse(clients.body);
                this.saveState()
                  .subscribe(
                    state => {
                      history.pushState('', document.title, window.location.pathname);
                    },
                    stateError => {
                      this.errorMessage = stateError;
                    });

                this.toolkit.getCachedClients()
                  .subscribe(
                    cachedClients => {
                      this.toolkit.cachedClients = cachedClients;
                      this.toolkit.setClientSecretFromCache();
                      this.mapSelectedAuthServer();
                      this.mapSelectedOAuthClient();
                      this.getSelectedApp();
                      this.toolkit.updateAuthorizeUrl();
                      this.toolkit.getTokenPayload()
                        .subscribe(
                          payload => {
                            this.toolkit.exchangePayload = payload;
                          }
                        );
                    },
                    cacheError => {
                      this.errorMessage = cacheError;
                    });
                this.widgetConfigEditor = new JsoneditorComponent();
                this.widgetConfigEditor.data = this.toolkit.liveWidgetConfig;

                this.appProfileEditor = new JsoneditorComponent();
                this.widgetConfigEditor.data = {};

                if (this.toolkit.widget) {
                  if (this.toolkit.authUrlValid) {
                    this.toolkit.widget.remove();
                    this.toolkit.widget.session.get((response) => {
                      if (response.status !== 'INACTIVE') {
                        this.toolkit.currentUser = response.login;

                        //this.toolkit.widget.getWithoutPrompt();
                        this.showLogin();
                        // get out tokens?
                      } else {
                        //this.toolkit.currentUser = undefined;
                        this.showLogin();
                      }
                    });
                  }
                }
                if (this.toolkit.authUrlValid && (!this.toolkit.decodedIdToken || !this.toolkit.decodedAccessToken)) {
                  //this.authenticate();
                }
              });
        },
        authServerError => {
          this.errorMessage = authServerError;
        });
  }

}
