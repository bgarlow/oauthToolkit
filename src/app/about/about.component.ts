import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})

export class AboutComponent implements OnInit {

  baseUrl;
  redirectUri;
  state;
  nonce;
  selectedAuthServer;
  selectedOauthClient;
  selectedScopes = '';
  selectedResponseType: string;
  authEndpoint: string;

  accessToken;
  idToken;
  decodedAccessToken;
  decodedIdToken;
  userInfo;

  fragmentArray = [];
  queryParams:any = {};

  authServers = [
    {
      index: 0,
      description: '',
      id: ''
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

  oauthClients = [
    {
      index: 0,
      description: '',
      id: '',
      secret: ''
    },
    {
      index: 1,
      description: '',
      id: '',
      secret: ''
    },
    {
      index: 2,
      description: '',
      id: '',
      secret: ''
    },
    {
      index: 3,
      description: '',
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
    this.buildAuthEndpointString();
    this.updateConfig();
    // call authorize
    window.location.href = this.authEndpoint;
  }

  introspectToken(token) {
    let options = {

    };
  }

  getUserInfo() {
    ///oauth2/aus6d64ifz9vPFAR41t7/v1/userinfo
    let endpoint = this.baseUrl + '/oauth2/' + this.selectedAuthServer.id + '/v1/userinfo';
    let headers = new Headers();

    this.http.get(endpoint, { headers: new HttpHeaders().set('Authorization', 'Bearer ' + this.accessToken)})
      .subscribe(data => {
        console.log(data);
        this.userInfo = data;
      });
  }

  buildAuthEndpointString() {
    this.authEndpoint =  this.baseUrl + '/oauth2/' + this.selectedAuthServer.id + '/v1/authorize' + '?client_id='
      + this.selectedOauthClient.id
      + '&response_type=' + this.selectedResponseType + '&scope=' + this.selectedScopes + '&redirect_uri=' + this.redirectUri
      + '&state=' + this.state + '&nonce=' + this.nonce;
  }

  selectAuthServer(authServer) {
    this.selectedAuthServer = authServer;
    //https://oktalane.okta.com/oauth2/aus6d64ifz9vPFAR41t7/v1/authorize
    this.buildAuthEndpointString();
  }

  removeAuthServer(authServer) {
    this.authServers[authServer.index].id = '';
    this.authServers[authServer.index].description = '';
  }

  selectOauthClient(oauthClient) {
    this.selectedOauthClient = oauthClient;
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

    this.baseUrl = (window.localStorage['baseUrl']) ? window.localStorage['baseUrl'] : '';
    this.redirectUri = (window.localStorage['redirectUri']) ? window.localStorage['redirectUri'] : '';
    this.state = (window.localStorage['state']) ? window.localStorage['state'] : '';
    this.nonce = (window.localStorage['nonce']) ? window.localStorage['nonce'] : '';
    this.selectedAuthServer = (window.localStorage['selectedAuthServer']) ? JSON.parse(window.localStorage['selectedAuthServer']) : {};
    this.selectedOauthClient = (window.localStorage['selectedOauthClient']) ? JSON.parse(window.localStorage['selectedOauthClient']) : {};
    this.selectedScopes = (window.localStorage['selectedScopes']) ? window.localStorage['selectedScopes'] : '';
    this.selectedResponseType = window.localStorage['selectedResponseType'];
    if (window.localStorage['authServerArray']) {
      this.authServers = JSON.parse(window.localStorage['authServerArray']);
    }
    if (window.localStorage['oauthClientArray']) {
      this.oauthClients = JSON.parse(window.localStorage['oauthClientArray']);
    }
    this.buildAuthEndpointString();

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
        }
      }
    });
  }

}
