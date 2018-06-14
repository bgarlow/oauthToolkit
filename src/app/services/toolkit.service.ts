import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
//import * as OktaSignIn from '@okta/okta-signin-widget';
import * as OktaSignIn from '@okta/okta-signin-widget/dist/js/okta-sign-in.min.js';
import {of} from 'rxjs/observable/of';

@Injectable()
export class ToolkitService {

  widget;
  currentUser;
  baseUrl;
  state;
  nonce;
  scopesClaim;
  menuClaims;
  unsafeApiKey;
  accessToken;
  idToken;
  refreshToken;
  decodedIdToken;
  decodedAccessToken;
  accessTokenExp;
  idTokenExp;
  refreshTokenExp;

  authorizationServers;
  oAuthClients = [];
  cachedClients = [];
  metadataEndpoint;
  authorizeUrl;
  tokenUrl;
  tokenPayload;
  authUrlValid;
  tokenUrlValid;

  selectedAuthServerId;
  selectedAuthServer;
  selectedOAuthClientId;
  selectedOAuthClient;
  unsafeSelectedClientSecret;
  selectedApp;
  selectedAppProfile;
  selectedGrantType;
  selectedResponseType = [];
  selectedRedirectUri;
  selectedScopes;
  supportedScopes;

  authServerUri;
  userScopes;
  maxScopeSet = [];

  oAuthConfig = {};
  oktaAuthJsConfig = {};
  originalWidgetConfig = {
    baseUrl: '',
    logo: './assets/Okta_Logo_BrightBlue_Medium.png',
    clientId: '',
    redirectUri: '',
    /* See also: https://github.com/okta/okta-signin-widget#registration */
    registration: {
      parseSchema: function(schema, onSuccess, onFailure) {
        // handle parseSchema callback
        onSuccess(schema);
      },
      preSubmit: function (postData, onSuccess, onFailure) {
        // handle preSubmit callback
        onSuccess(postData);
      },
      postSubmit: function (response, onSuccess, onFailure) {
        // handle postsubmit callback
        onSuccess(response);
      }
    },
    authParams: {
      issuer: '',
      responseType: [],
      scopes: [],
      display: 'page',
      state: this.state,
      nonce: this.nonce
    },
    features: {
      router: true,
      registration: false,
      securityImage: false,
      autoPush: true
    },
    /* See also: https://developer.okta.com/code/javascript/okta_sign-in_widget.html#customization */
    language: "en",
    // The i18n object maps language codes to a hash of property keys ->
    // property values.
    i18n: {
      // Overriding English properties
      'en': {
        'primaryauth.title': 'Sign in to the Toolkit',
        'primaryauth.username.placeholder': 'Your username'
      }
    },
    // An example that adds a custom button underneath the login form on the primary auth page
    customButtons: []
  };

  updatedWidgetConfig = this.originalWidgetConfig;

  set liveWidgetConfig(value) {
    this.updatedWidgetConfig = value;
  }

  get liveWidgetConfig() {
    //return JSON.stringify(this.updatedWidgetConfig, undefined, 2); // string version was used prior to jsoneditor
    return this.updatedWidgetConfig;
  }

  /**
   * Role Groups (document editors, document creators, document administrators)
   *  -> sets values on "menus" attribute. menu.tier1.tier2, i.e. window.active_tool_window.hide_active_tool_window. <- will need to be mapped in app
   *  -> sets values on "role_scopes" attribute. window, window.manage_tabs, window.manage_tools
   *
   *  ??? Can values be set up as enumerations in Okta?
   *
   * @type {{}}
   */

  dynamicMenus = [
    'window',
    'window.active_tool',
    'window.active_tool.hide_active',
    'window.active_tool.hide_side',
    'window.active_tool.hide_all',
    'window.editor_tabs',
    'window.editor_tabs.select_next',
    'window.editor_tabs.tab_placement'
  ];

  dynamicScopes = {

  };

  updateWidgetConfig() {
    if (this.widget) {
      this.widget.remove();
      this.widget = undefined;
    }
    /* TODO: update the rest of the config stuff */
    this.updatedWidgetConfig = this.liveWidgetConfig;
    this.selectedScopes = this.liveWidgetConfig.authParams.scopes;
    this.selectedAuthServerId = this.liveWidgetConfig.authParams.issuer;
    this.selectedOAuthClientId = this.liveWidgetConfig.clientId;
    this.initWidget();
  }
  /**
   *  initialize our widget with the latest configuration options
   */
  initWidget() {
    this.widget = new OktaSignIn(this.updatedWidgetConfig);
  }

  signout() {
    if (this.widget) {
      this.widget.session.close();
    }
    this.currentUser = undefined;
  }

  /**
   * Get metadata from the well-known endpoint for the selected auth server
   * @param authServer
   */
  getMetadata(authServer): Observable<any> {

    if (typeof authServer === 'string') {
      this.metadataEndpoint = this.baseUrl + '/oauth2/' + authServer + '/.well-known/oauth-authorization-server';
    } else {
      this.metadataEndpoint = this.baseUrl + '/oauth2/' + authServer.id + '/.well-known/oauth-authorization-server';
    }

    return this.http.get(this.metadataEndpoint);
  }

  /**
   * Get a list of authorization servers from the selected Okta org
   * @returns {Observable<any>}
   */
  getAuthorizationServers(): Observable<any> {
    return this.http.get('/demo/authorizationServers');
  }


  /**
   * get the client secret from the cached OAuth client, set the value on OAuthClients
   */
  setClientSecretFromCache() {
    for (let client of this.oAuthClients) {
      for (let cachedClient of this.cachedClients) {
        if (client.client_id === cachedClient.client_id) {
          client.client_secret = cachedClient.client_secret;
        }
      }
    }
  }

  /**
   * Save OAuth clients to cookie
    * @returns {Observable<any>}
   */
  cacheClients(): Observable<any> {
    return this.http.put('/demo/cachedClients', this.oAuthClients);
  }

  // return cached clients from cookie, if available
  getCachedClients(): Observable<any> {
    return this.http.get('/demo/cachedClients');
  }

  // Delete cached clients (remove from cookie
  clearCachedClients(): Observable<any> {
    return this.http.delete('/demo/cachedClients');
  }


  getCachedToken(tokenType): Observable<any> {
    const uri = '/demo/tokenstorage/' + tokenType;
    return this.http.get(uri);
  }

  cacheToken(token, tokenType): Observable<any> {
    const uri = '/demo/tokenstorage';

    const payload = {
      token_type: tokenType,
      token: token
    };

    return this.http.put('/demo/tokenstorage', payload);
  }

  clearCachedToken(tokenType): Observable<any> {
    const uri = '/demo/tokenstorage/' + tokenType;

    return this.http.delete(uri);
  }

  /**
   * clear the state cookie when loading new org info
   * @returns {Observable<any>}
   */
  clearState(): Observable<any> {
    return this.http.delete('/demo/state');
  }

  /**
   * Get a list of OAUth clients (apps) in the selected Okta org
   * @returns {Observable<any>}
   */
  getClients(): Observable<any> {
    return this.http.get('/demo/clients');
  }

  /**
   * Return the app object that corresponds to the selected OAuth client
   * @returns {Observable<any>}
   */
  getSelectedApp(): Observable<any> {
    return this.http.get('/demo/apps/' + this.selectedOAuthClient.client_id);
  }

  /*
 * Call the /token endpoint for client credentials flow. Have to use the Node backend for this one
 */
  getToken(): Observable<any> {

    this.authServerUri = this.getAuthServerUri();
    const endpoint = this.baseUrl + '/oauth2/' + this.authServerUri + 'v1/token';

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return this.http.post('/demo/token', this.tokenPayload, httpOptions);
  }

  /**
   * Get user info from /userinfo endpoint
   */
  getUserInfo(token): Observable<any> {
    const payload = {
      token: token
    };

    return this.http.post('/demo/userinfo', payload);
  }

  /**
   * Revoke token
   * @param token
   * @param token_type
   * @returns {Observable<any>}
   */
  revokeToken(token, token_type): Observable<any> {
    const payload = {
      token: token,
      token_type: token_type
    };

    return this.http.post('/demo/revoke', payload);
  }

  /**
   * Validate the token with Okta's /introspect endpoint
   */
  introspectToken(token, token_type): Observable<any> {
    const payload = {
      token: token,
      token_type: token_type
    };

    return this.http.post('/demo/introspect', payload);
  }

  /**
   *
   */
  getMaxScopeSet() {
    if (this.userScopes) {
      this.maxScopeSet = [];
      let scopes = this.supportedScopes;
      for (let scope of scopes) {
        if (this.userScopes.includes(scope)) {
          this.maxScopeSet.push(scope);
        }
      }
      console.log(this.maxScopeSet);
    }
  }

  /**
   * return authServerID or / (if using SSO auth server)
   * @returns {any}
   */
  getAuthServerUri() {
    this.authServerUri = (this.selectedAuthServer.id) ? this.selectedAuthServer.id + '/' : '';
    return this.authServerUri;
  }

  /**
   *
   * @returns {any[]}
   */
  getResponseTypeIdentifiers() {
    let responseTypes = [];

    if (!this.selectedResponseType) {
      return responseTypes;
    }

    const keys = Object.keys(this.selectedResponseType);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (this.selectedResponseType[key].selected) {
        responseTypes.push(this.selectedResponseType[key].type);
      }
    }
    return responseTypes;
  }

  /**
   * Update the authorize URL based on current user selections
   */
  updateAuthorizeUrl() {
    this.authUrlValid = false;
    this.tokenUrlValid = false;
    this.authorizeUrl = '';
    this.tokenUrl = '';

    this.state = 'mystate';
    this.nonce = 'mynonce';

    const scopes =  this.selectedScopes ? this.selectedScopes.join(' ') : undefined;
    const responseTypes = this.selectedResponseType ? this.getResponseTypeIdentifiers().join(' ') : undefined;

    this.authUrlValid = (this.baseUrl && this.selectedAuthServerId && this.selectedOAuthClientId && responseTypes && scopes && this.selectedRedirectUri && this.state && this.nonce) !== undefined;
    this.tokenUrlValid = (this.baseUrl && this.selectedAuthServerId && responseTypes && scopes && this.state && this.nonce && this.selectedOAuthClient && this.selectedOAuthClient.client_secret) !== undefined;

    this.tokenPayload = {
      scope: this.selectedScopes.join(' '),
      grant_type: this.selectedGrantType,
      redirect_uri: this.selectedRedirectUri,
      client_id: this.selectedOAuthClientId,
      client_secret: this.selectedOAuthClient.client_secret
    };

    if (this.selectedGrantType === 'refresh_token') {
      this.tokenPayload.refresh_token = this.refreshToken;
    }

    this.authorizeUrl =  this.baseUrl + '/oauth2/' + this.selectedAuthServerId + '/v1/authorize' + '?client_id='
      + this.selectedOAuthClientId
      + '&response_type=' + responseTypes + '&scope=' + scopes + '&redirect_uri=' + this.selectedRedirectUri
      + '&state=' + this.state + '&nonce=' + this.nonce; // + '&sessionToken=' + this.sessionToken;

    this.tokenUrl = this.baseUrl + '/oauth2/' + this.selectedAuthServerId + '/v1/token';

    this.updatedWidgetConfig.baseUrl = this.baseUrl;
    this.updatedWidgetConfig.clientId = this.selectedOAuthClientId;
    this.updatedWidgetConfig.redirectUri = this.selectedRedirectUri;
    this.updatedWidgetConfig.authParams.issuer = this.selectedAuthServerId;
    this.updatedWidgetConfig.authParams.responseType = this.getResponseTypeIdentifiers();
    this.updatedWidgetConfig.authParams.scopes = this.selectedScopes;
    this.updatedWidgetConfig.authParams.state = this.state;
    this.updatedWidgetConfig.authParams.nonce = this.nonce;

    let sessionUrl = this.baseUrl + '/api/v1/sessions/me';
    let sessionButton = {
      title: 'Session Info',
      className: 'btn-customAuth',
      click: function() {
        // Open a popup with the current session info
        window.open(sessionUrl, '_blank', 'location=yes,height=570,width=700,scrollbars=yes,status=yes');
      }
    };

    this.updatedWidgetConfig.customButtons[0] = sessionButton;

    if (this.authUrlValid) {
      this.updateWidgetConfig();
    }

  }

  /**
   *  Clear out response messages
   *  TODO: rename this method
   */
  clearLocalTokens() {
    //this.userInfo = undefined;
    this.userScopes = undefined;
  }

  /**
   * Parse token and return JSON
   */
  parseJwt(token): Observable<any> {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    const decoded = window.atob(base64);
    const decodedJSON = JSON.parse(decoded);

    return of(decodedJSON);
  }

  // auth
  /**
   * Log in using auth endpoint
   */
  authenticate(): void {
    this.updateAuthorizeUrl();
    // call authorize
    window.location.href = this.authorizeUrl;
  }

  /**
   * Request a new access token with expanded scopes
   */
  rescopeToken(): void {
    this.getMaxScopeSet();
    //const newScopes = this.selectedScopes.concat(this.maxScopeSet);
    //this.selectedScopes = Array.from(new Set(newScopes));
    this.selectedScopes = this.maxScopeSet;
    this.updateAuthorizeUrl();
  }


  /**
   * Constructor
   * @param {HttpClient} http
   */
  constructor(private http: HttpClient) {}

}
