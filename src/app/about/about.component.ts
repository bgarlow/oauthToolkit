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
  queryParams:any = {};

  // array of authorization servers for testing various scenarios
  authServers = [
    {
      index: 0,
      description: 'Universal Exports [QA]',
      id: 'aus6d64ifz9vPFAR41t7'
    },
    {
      index: 1,
      description: '',
      id: ''
    },
    {
      index: 2,
      description: '',
      id: ''
    },
    {
      index: 3,
      description: '',
      id: ''
    },
    {
      index: 4,
      description: '',
      id: ''
    }
  ];

  // Array of oauthClients for testing various scenarios
  oauthClients = [
    {
      index: 0,
      description: 'Universal Exports (use case 1) Single Page App',
      id: '0oa6d67ir4VRt3Ff01t7',
      secret: ''
    },
    {
      index: 1,
      description: 'Universal Exports web app (use case 2)',
      id: '0oa6eogos4vgsBmFt1t7',
      secret: 'dCvQGEAE8OBxY5K7NRDN2VeVsHak4l6z38ncY7iq'
    },
    {
      index: 2,
      description: 'Universal Exports (use case 3a) service-to-service',
      id: '0oa6epn1x6uuiMc4g1t7',
      secret: '9iIz4jS3l7ZUctH9VkveyLF8LjWilcRPI1sdPcEI'
    },
    {
      index: 3,
      description: 'l',
      id: '',
      secret: ''
    },
    {
      index: 4,
      description: '',
      id: '',
      secret: ''
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
  }

  saveConfig() {
    this.updateConfig();
  }

  authenticate(): void {
    this.buildEndpointString();
    this.updateConfig();
    // call authorize
    window.location.href = this.authEndpoint;
  }

  /*
   * Call the /token endpoint for client credentials flow. Have to use the Node backend for this one
   */
  getToken(): void {
    const endpoint = this.baseUrl + '/oauth2/' + this.selectedAuthServer.id + '/v1/token';

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
        err => {
          console.error(`/token ${err}`);
          this.errorMessage = err;
      });
  }

  introspectToken(token) {
    const endpoint = this.baseUrl + '/oauth2/' + this.selectedAuthServer.id + '/v1/introspect';
    const authHeaderVal = 'Basic ' + btoa(this.selectedOauthClient.id + ':' + this.selectedOauthClient.secret);

    let body: HttpParams;
    let headers: HttpHeaders;

    if (!this.selectedOauthClient.secret || this.selectedOauthClient.secret.length < 1) {
      body = new HttpParams()
        .set('token', this.accessToken)
        .set('token_type_hint', 'access_token')
        .set('client_id', this.selectedOauthClient.id);
    } else {
      body = new HttpParams()
        .set('token', this.accessToken)
        .set('token_type_hint', 'access_token')
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
      .subscribe(data => {
        console.log(data);
        this.introspectResponse = data;
      });
  }

  revokeToken(token) {
    const endpoint = this.baseUrl + '/oauth2/' + this.selectedAuthServer.id + '/v1/revoke';
    const authHeaderVal = 'Basic ' + btoa(this.selectedOauthClient.id + ':' + this.selectedOauthClient.secret);

    let body: HttpParams;
    let headers: HttpHeaders;

    if (!this.selectedOauthClient.secret || this.selectedOauthClient.secret.length < 1) {
      body = new HttpParams()
        .set('token', this.accessToken)
        .set('token_type_hint', 'access_token')
        .set('client_id', this.selectedOauthClient.id);
    } else {
      body = new HttpParams()
        .set('token', this.accessToken)
        .set('token_type_hint', 'access_token')
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
      .subscribe(data => {
          this.clearLocalTokens();
      });
  }

  showMetadata(authServer) {
    let endpoint = this.baseUrl + '/oauth2/' + authServer.id + '/.well-known/oauth-authorization-server';

    this.http.get(endpoint)
      .subscribe(data => {
        this.metadataResponse = data;
        console.log(this.metadataResponse);
      });
  }

  clearLocalTokens() {
    this.accessToken = '';
    this.idToken = '';
  }

  clearErrorMessage() {
    this.errorMessage = undefined;
  }

  clearMetadataResponse() {
    this.metadataResponse = undefined;
  }

  getUserInfo() {
    ///oauth2/aus6d64ifz9vPFAR41t7/v1/userinfo
    let endpoint = this.baseUrl + '/oauth2/' + this.selectedAuthServer.id + '/v1/userinfo';
    let headers = new Headers();

    this.http.get(endpoint, { headers: new HttpHeaders().set('Authorization', 'Bearer ' + this.accessToken)})
      .subscribe(
        data => {
          this.userInfo = data;
        }
      );
  }

  buildEndpointString() {
    this.authEndpoint =  this.baseUrl + '/oauth2/' + this.selectedAuthServer.id + '/v1/authorize' + '?client_id='
      + this.selectedOauthClient.id
      + '&response_type=' + this.selectedResponseType + '&scope=' + this.selectedScopes + '&redirect_uri=' + this.redirectUri
      + '&state=' + this.state + '&nonce=' + this.nonce;

    this.tokenEndpoint = this.baseUrl + '/oauth2/' + this.selectedAuthServer.id + '/v1/token';
  }

  selectAuthServer(authServer) {
    this.selectedAuthServer = authServer;
    //https://oktalane.okta.com/oauth2/aus6d64ifz9vPFAR41t7/v1/authorize
    this.buildEndpointString();
  }

  removeAuthServer(authServer) {
    this.authServers[authServer.index].id = '';
    this.authServers[authServer.index].description = '';
  }

  selectOauthClient(oauthClient) {
    this.selectedOauthClient = oauthClient;
    this.buildEndpointString();
  }

  removeOauthClient(oauthClient) {
    this.oauthClients[oauthClient.index].id = '';
    this.oauthClients[oauthClient.index].description = '';
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
    this.buildEndpointString();

    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        this.fragmentArray = fragment.split('&');
        for (let item of this.fragmentArray) {
          let tmp = item.split('=');
          this.queryParams[tmp[0]] = tmp[1];
        }

        if (this.queryParams['access_token']) {
          this.accessToken = this.queryParams['access_token'];
          this.decodedAccessToken = this.parseJwt(this.accessToken);
        }

        if (this.queryParams['id_token']) {
          this.idToken = this.queryParams['id_token'];
          this.decodedIdToken = this.parseJwt(this.idToken);
          if (this.decodedIdToken.ue_spa_app_menu_groups) {
            this.menuClaims = this.decodedIdToken.ue_spa_app_menu_groups;
          }
        }
      }
    });
  }

}
