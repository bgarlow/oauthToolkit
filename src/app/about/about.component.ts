import { Component, OnInit } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})

export class AboutComponent implements OnInit {

  baseUrl='https://oktalane.okta.com';
  redirectUri='http://localhost:4200/about';
  state='mystate';
  nonce='mynonce';
  selectedAuthServer;
  selectedOauthClient;
  selectedScopes = 'openid';
  selectedResponseType = 'token id_token';
  authEndpoint: string;
  tokenEndpoint: string;
  authServerUri;
  supportedScopes;
  userScopes;

  username;
  password;

  sessionToken;
  accessToken;
  idToken;
  decodedAccessToken;
  decodedIdToken;
  userInfo;
  introspectResponse;
  revokeResponse;
  metadataResponse;
  errorMessage;

  menuClaims;

  fragmentArray = [];
  queryParams: any = {};

  // array of authorization servers for testing various scenarios
  authServers = [
    {
      index: 0,
      description: 'Universal Exports [QA]',
      id: 'aus6d64ifz9vPFAR41t7',
      selected: false
    },
    {
      index: 1,
      description: 'Universal Exports [Production]',
      id: 'aus6f3tat4dXRW8A71t7',
      selected: false
    },
    {
      index: 2,
      description: '',
      id: '',
      selected: false
    },
    {
      index: 3,
      description: '',
      id: '',
      selected: false
    },
    {
      index: 4,
      description: 'default',
      id: '',
      selected: false
    }
  ];

  // Array of oauthClients for testing various scenarios
  oauthClients = [
    {
      index: 0,
      description: 'Universal Exports (use case 1 - User Impersonation)',
      id: '0oa6d67ir4VRt3Ff01t7',
      secret: '',
      selected: false
    },
    {
      index: 1,
      description: 'Universal Exports (use case 2) Dynamic Menu',
      id: '0oa6epnxuqg0wPPnq1t7',
      secret: '',
      selected: false
    },
    {
      index: 2,
      description: 'Universal Exports (user case 3a) end user access',
      id: '0oa6fh7oybJ41BFWb1t7',
      secret: '',
      selected: false
    },
    {
      index: 3,
      description: 'Universal Exports (use case 3b) external client credentials',
      id: '0oa6epn1x6uuiMc4g1t7',
      secret: '9iIz4jS3l7ZUctH9VkveyLF8LjWilcRPI1sdPcEI',
      selected: false
    },
    {
      index: 4,
      description: 'testme',
      id: '0oa6finukjNISDeWA1t7',
      secret: '8iNH-t97ecLDaMYavc5lJx1m9zfW_lFdiqnyxFcd',
      selected: false
    }
  ];

  updateConfig(): void {
    window.localStorage['baseUrl'] = this.baseUrl;
    window.localStorage['redirectUri'] = this.redirectUri;
    window.localStorage['state'] = this.state;
    window.localStorage['nonce'] = this.nonce;
    window.localStorage['selectedAuthServer'] = JSON.stringify(this.selectedAuthServer);
    window.localStorage['selectedOauthClient'] = JSON.stringify(this.selectedOauthClient);
    window.localStorage['selectedScopes'] = this.selectedScopes;
    window.localStorage['selectedResponseType'] = this.selectedResponseType;
    window.localStorage['authServerArray'] = JSON.stringify(this.authServers);
    window.localStorage['oauthClientArray'] = JSON.stringify(this.oauthClients);
    window.localStorage['username'] = this.username;
    window.localStorage['password'] = this.password;
  }

  saveConfig() {
    this.updateConfig();
  }

  /**
   * Log in to establish Okta session, drop a cookie, and auth with the OIDC app for tokens
   */
  authenticate(): void {
    this.updateConfig();
    this.buildEndpointString();
    // call authorize
    window.location.href = this.authEndpoint;
  }

  /*
   * Call the /token endpoint for client credentials flow. Have to use the Node backend for this one
   */
  getToken(): void {
    this.authServerUri = this.getAuthServerUri();
    const endpoint = this.baseUrl + '/oauth2/' + this.authServerUri + 'v1/token';

    this.clearLocalTokens();

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    let payload = {
      endpoint: endpoint,
      clientId: this.selectedOauthClient.id,
      clientSecret: this.selectedOauthClient.secret,
      scope: this.selectedScopes
    };

    this.http.post('/demo/token', payload, httpOptions)
      .subscribe(
        data => {
          if (data['statusCode'] === 200) {
            let token = JSON.parse(data['body']);
            this.accessToken = token.access_token;
            this.decodedAccessToken = this.parseJwt(this.accessToken);
          } else {
            console.error(`/token ${data}`);
            this.errorMessage = data;
          }
        },
        error => {
          this.errorMessage = error;
      });
  }

  introspectToken(token, tokenType) {
    const endpoint = this.baseUrl + '/oauth2/' + this.authServerUri + 'v1/introspect';
    const authHeaderVal = 'Basic ' + btoa(this.selectedOauthClient.id + ':' + this.selectedOauthClient.secret);

    let body: HttpParams;
    let headers: HttpHeaders;

    if (!this.selectedOauthClient.secret || this.selectedOauthClient.secret.length < 1) {
      body = new HttpParams()
        .set('token', token)
        .set('token_type_hint', tokenType)
        .set('client_id', this.selectedOauthClient.id);
    } else {
      body = new HttpParams()
        .set('token', token)
        .set('token_type_hint', tokenType);
    }

    if (this.selectedOauthClient.secret && this.selectedOauthClient.secret.length > 0) {
      headers = new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Authorization', authHeaderVal);
    } else {
      headers = new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded');
    }

    this.http.post(endpoint, body.toString(), {headers})
      .subscribe(
        data => {
          this.introspectResponse = data;
        },
        error => {
          this.errorMessage = error;
        });
  }

  revokeToken(token, tokenType) {
    const endpoint = this.baseUrl + '/oauth2/' + this.authServerUri + 'v1/revoke';
    const authHeaderVal = 'Basic ' + btoa(this.selectedOauthClient.id + ':' + this.selectedOauthClient.secret);

    let body: HttpParams;
    let headers: HttpHeaders;

    if (!this.selectedOauthClient.secret || this.selectedOauthClient.secret.length < 1) {
      body = new HttpParams()
        .set('token', token)
        .set('token_type_hint', tokenType)
        .set('client_id', this.selectedOauthClient.id);
    } else {
      body = new HttpParams()
        .set('token', token)
        .set('token_type_hint', tokenType);
    }

    if (this.selectedOauthClient.secret && this.selectedOauthClient.secret.length > 0) {
      headers = new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Authorization', authHeaderVal);
    } else {
      headers = new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded');
    }

    this.http.post(endpoint, body.toString(), {headers})
      .subscribe(
        data => {
          this.clearLocalTokens();
        },
        error => {
          this.errorMessage = error;
        });
  }

  selectScope(scope) {
    let scopeArray = this.selectedScopes.split(' ');
    if (!scopeArray.includes(scope)) {
      scopeArray.push(scope);
    } else {
      scopeArray.pop(scope);
    }
    this.selectedScopes = scopeArray.join(' ');
  }

  getSupportedScopes(authServer) {
    let endpoint;

    if (authServer === undefined || authServer.description === 'default') {
      endpoint = this.baseUrl + '/.well-known/openid-configuration';
    } else {
      endpoint = this.baseUrl + '/oauth2/' + authServer.id + '/.well-known/oauth-authorization-server';
    }
    this.http.get(endpoint)
      .subscribe(
        data => {
        this.supportedScopes = data['scopes_supported'];
      },
        error => {
          this.errorMessage = error;
        }
      );
  }

  getMetadata(authServer) {
    let endpoint;

    if (authServer === undefined || authServer.description === 'default') {
      endpoint = this.baseUrl + '/.well-known/openid-configuration';
    } else {
      endpoint = this.baseUrl + '/oauth2/' + authServer.id + '/.well-known/oauth-authorization-server';
    }

    this.http.get(endpoint)
      .subscribe(
        data => {
          this.metadataResponse = data;
          this.supportedScopes = data['scopes_supported'];
        },
        error => {
          this.errorMessage = error;
        });
  }

  /**
   * Check to see if there's an existing session
   */
  getSession() {

  }

  /**
   * log our of our demo session
   */
  logout() {

  }

  clearLocalTokens() {
    this.accessToken = '';
    this.idToken = '';
    this.introspectResponse = undefined;
    this.userInfo = undefined;
    this.userScopes = undefined;
  }

  clearErrorMessage() {
    this.errorMessage = undefined;
  }

  clearMetadataResponse() {
    this.metadataResponse = undefined;
  }

  getUserInfo() {
    const endpoint = this.baseUrl + '/oauth2/' + this.authServerUri + 'v1/userinfo';
    const headers = new Headers();

    this.http.get(endpoint, { headers: new HttpHeaders().set('Authorization', 'Bearer ' + this.accessToken)})
      .subscribe(
        data => {
          this.userInfo = data;
        },
        error => {
          this.errorMessage = error;
        });
  }

  getAuthServerUri() {
    this.authServerUri = (this.selectedAuthServer.id) ? this.selectedAuthServer.id + '/' : '';
    return this.authServerUri;
  }

  buildEndpointString() {
    this.authServerUri = this.getAuthServerUri();
    this.authEndpoint =  this.baseUrl + '/oauth2/' + this.authServerUri + 'v1/authorize' + '?client_id='
      + this.selectedOauthClient.id
      + '&response_type=' + this.selectedResponseType + '&scope=' + this.selectedScopes + '&redirect_uri=' + this.redirectUri
      + '&state=' + this.state + '&nonce=' + this.nonce; // + '&sessionToken=' + this.sessionToken;

    this.tokenEndpoint = this.baseUrl + '/oauth2/' + this.authServerUri + 'v1/token';

  }

  hackClearSelectedAuthServer() {
    for (let server of this.authServers) {
      server.selected = false;
    }
  }

  selectAuthServer(authServer) {
    this.hackClearSelectedAuthServer();
    this.selectedAuthServer = authServer;
    authServer.selected = true;
    this.getSupportedScopes(authServer);
    this.buildEndpointString();
  }

  removeAuthServer(authServer) {
    this.authServers[authServer.index].id = '';
    this.authServers[authServer.index].description = '';
    this.authServers[authServer.index].selected = false;
  }

  hackClearSelectedClient() {
    for (let client of this.oauthClients) {
      client.selected = false;
    }
  }

  selectOauthClient(oauthClient) {
    this.hackClearSelectedClient();
    this.selectedOauthClient = oauthClient;
    oauthClient.selected = true;
    this.buildEndpointString();
  }

  removeOauthClient(oauthClient) {
    this.oauthClients[oauthClient.index].id = '';
    this.oauthClients[oauthClient.index].description = '';
    this.oauthClients[oauthClient.index].secret = '';
    this.oauthClients[oauthClient.index].selected = false;
  }

  parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
  }

  copyIdToken() {
  }

  constructor(private route: ActivatedRoute, private http: HttpClient) {
  }

  ngOnInit() {

    this.getSession();

    this.baseUrl = (window.localStorage['baseUrl']) ? window.localStorage['baseUrl'] : this.baseUrl;
    this.redirectUri = (window.localStorage['redirectUri']) ? window.localStorage['redirectUri'] : this.redirectUri;
    this.state = (window.localStorage['state']) ? window.localStorage['state'] : this.state;
    this.nonce = (window.localStorage['nonce']) ? window.localStorage['nonce'] : this.nonce;
    this.selectedAuthServer = (window.localStorage['selectedAuthServer']) ? JSON.parse(window.localStorage['selectedAuthServer']) : {};
    this.selectedOauthClient = (window.localStorage['selectedOauthClient']) ? JSON.parse(window.localStorage['selectedOauthClient']) : {};
    this.selectedScopes = (window.localStorage['selectedScopes']) ? window.localStorage['selectedScopes'] : this.selectedScopes;
    this.selectedResponseType = (window.localStorage['selectedResponseType']) ? window.localStorage['selectedResponseType'] : this.selectedResponseType;
    this.authServers = (window.localStorage['authServerArray']) ? JSON.parse(window.localStorage['authServerArray']) : this.authServers;
    this.oauthClients = (window.localStorage['oauthClientArray']) ? JSON.parse(window.localStorage['oauthClientArray']) : this.oauthClients;
    this.username = (window.localStorage['username']) ? (window.localStorage['username']) : '';
    this.password = (window.localStorage['password']) ? (window.localStorage['password']) : '';
    this.errorMessage = undefined;

    this.getSupportedScopes(this.selectedAuthServer);
    this.buildEndpointString();

    this.route.fragment.subscribe(
      fragment => {
      if (fragment) {
        this.fragmentArray = fragment.split('&');
        for (let item of this.fragmentArray) {
          let tmp = item.split('=');
          this.queryParams[tmp[0]] = tmp[1];
        }

        if (this.queryParams['error']) {
          this.errorMessage = this.queryParams;
        }

        if (this.queryParams['access_token']) {
          this.accessToken = this.queryParams['access_token'];
          this.decodedAccessToken = this.parseJwt(this.accessToken);
        }

        if (this.queryParams['id_token']) {
          this.idToken = this.queryParams['id_token'];
          this.decodedIdToken = this.parseJwt(this.idToken);
          this.userScopes = (this.decodedIdToken['user_scopes']) ? this.decodedIdToken['user_scopes'] : undefined;
          if (this.decodedIdToken.ue_spa_app_menu_groups) {
            this.menuClaims = this.decodedIdToken.ue_spa_app_menu_groups;
          }
        }
      }
    },
        error => {
        this.errorMessage = error;
      });
  }

}
