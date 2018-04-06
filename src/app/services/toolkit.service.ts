import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

@Injectable()
export class ToolkitService {

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

  authorizationServers;
  oAuthClients;
  metadataEndpoint;
  authorizeUrl;
  tokenUrl;
  authUrlValid;
  tokenUrlValid;

  selectedAuthServerId;
  selectedAuthServer;
  selectedOAuthClientId;
  selectedOAuthClient;
  selectedApp;
  selectedAppProfile;
  selectedGrantType;
  selectedResponseType = [];
  selectedRedirectUri;
  selectedScopes;
  supportedScopes;

  authServerUri;
  userScopes;
  maxScopeSet;

  oAuthConfig = {};
  oktaAuthJsConfig = {};
  oktaWidgetConfig = {};

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
   * Get a list of OAUth clients (apps) in the selected Okta org
   * @returns {Observable<any>}
   */
  getClients(): Observable<any> {
    return this.http.get('/demo/clients');
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

    let payload = {
      endpoint: endpoint,
      clientId: this.selectedOAuthClient.id,
      clientSecret: this.selectedOAuthClient.secret,
      scope: this.selectedScopes
    };

    return this.http.post('/demo/token', payload, httpOptions);
  }

  getMaxScopeSet() {
    for (let scope of this.supportedScopes) {
      if (this.userScopes.includes(scope)) {
        this.maxScopeSet.push(scope);
      }
    }
    console.log(this.maxScopeSet);
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
    const responseTypes = this.getResponseTypeIdentifiers().join(' ');

    this.authUrlValid = this.baseUrl && this.selectedAuthServerId && this.selectedOAuthClientId && responseTypes && scopes && this.selectedRedirectUri && this.state && this.nonce;
    this.tokenUrlValid = this.baseUrl && this.selectedAuthServerId && responseTypes;

    this.authorizeUrl =  this.baseUrl + '/oauth2/' + this.selectedAuthServerId + '/v1/authorize' + '?client_id='
      + this.selectedOAuthClientId
      + '&response_type=' + responseTypes + '&scope=' + scopes + '&redirect_uri=' + this.selectedRedirectUri
      + '&state=' + this.state + '&nonce=' + this.nonce; // + '&sessionToken=' + this.sessionToken;

    this.tokenUrl = this.baseUrl + '/oauth2/' + this.selectedAuthServerId + '/v1/token';
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
  parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');

    return JSON.parse(window.atob(base64));
  }

  /**
   * Constructor
   * @param {HttpClient} http
   */
  constructor(private http: HttpClient) { }

}
