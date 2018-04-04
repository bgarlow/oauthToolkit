import {Component, OnInit} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-toolkit',
  templateUrl: './toolkit.component.html',
  styleUrls: ['./toolkit.component.css']
})

export class ToolkitComponent implements OnInit {

  oktaConfig;
  oktaTenant;
  oktaDomain;
  baseUrl;
  state;
  nonce;
  authorizationServers;
  oAuthClients;
  authorizeUrl;
  tokenUrl;

  selectedAuthServerId;
  selectedOAuthClientId;
  selectedOAuthClient;
  selectedGrantType;
  selectedResponseType = [];
  selectedRedirectUri;
  selectedScopes = [];

  errorMessage;
  responseMessage;

  /**
   * load Okta Config info
   */
  loadOktaConfig() {
    this.http.get('/demo/oktaConfig')
      .subscribe(
        data => {
          this.oktaConfig = data['oktaConfig'];
          this.oktaTenant = this.oktaConfig.oktaTenant;
          this.oktaDomain = this.oktaConfig.oktaDomain;
          this.baseUrl = 'https://' + this.oktaTenant + '.' + this.oktaDomain;
        },
        error => {
          console.log(error);
        }
      );
  }

  /**
   * Get a list of the authorization servers configured in this Okta instance
   */
  getAuthorizationServers() {

    this.http.get('/demo/authorizationServers')
      .subscribe(
        data => {
          this.authorizationServers = JSON.parse(data.toString());
        },
        error => {
          console.log(error);
        }
      );
  }

/**
 * Get a list of OAuth clients
 */
  getClients() {
    this.http.get('/demo/clients')
      .subscribe(
        data => {
          this.oAuthClients = JSON.parse(data.toString());
        },
        error => {
          console.log(error);
        }
      );
  }

  /**
   * Selected auth server
   */
  selectAuthServer(authServer) {
    this.selectedAuthServerId = authServer;
    this.updateAuthorizeUrl();
  }

  /**
   * @param oauthClient
   */
  selectOAuthClient(oauthClient) {
    this.selectedOAuthClientId = oauthClient.client_id;
    this.selectedOAuthClient = oauthClient;

    if (oauthClient.grant_types.length < 2) {
      this.selectedGrantType = oauthClient.grant_types[0];
    }

    if (oauthClient.redirect_uris.length < 2) {
      this.selectedRedirectUri = oauthClient.redirect_uris[0];
    }

    this.selectedResponseType = [];
    for (let type of oauthClient.response_types) {
      this.selectedResponseType.push({
        type: type,
        selected: true
      });
    }

    this.updateAuthorizeUrl();
  }

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
   * Check to see if the current response_type is one of the selected types
   * @param type
   * @returns {any}
   */
  isSelectedType(type) {
    const keys = Object.keys(this.selectedResponseType);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (this.selectedResponseType[key].type === type) {
        return this.selectedResponseType[key].selected;
      }
    }
    return false;
  }

  /**
   * Handle selecting and or deselecting UI options
   */
  selectResponseType(type) {
    const keys = Object.keys(this.selectedResponseType);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (this.selectedResponseType[key].type === type) {
        this.selectedResponseType[key].selected = !this.selectedResponseType[key].selected;
      }
    }
    this.updateAuthorizeUrl();
  }

  selectGrantType(grantType) {
    this.selectedGrantType = grantType;
    this.updateAuthorizeUrl();
  }

  selectRedirectUri(redirectUri) {
    this.selectedRedirectUri = redirectUri;
    this.updateAuthorizeUrl();
  }

  /**
   * post our current state variables to node back end, stuff them in a cookie
   */
  saveState() {

    const payload = {
      state: {
        selectedAuthServerId: this.selectedAuthServerId,
        selectedOauthClientId: this.selectedOAuthClientId,
        selectedResponseType: this.selectedResponseType,
        selectedGrantType: this.selectedGrantType,
        selectedRedirectUri: this.selectedRedirectUri
      }
    };

    this.http.put('/demo/state', payload)
      .subscribe(
        data => {
          console.log(data);
        },
        error => {
          console.log(error);
        }
      );
  }

  /**
   * Retrieve toolkit state from cookie
   */
  loadState() {
    this.http.get('/demo/state')
      .subscribe(
        data => {
          this.selectedAuthServerId = (data['selectedAuthServerId']) ? data['selectedAuthServerId'] : undefined;
          this.selectedOAuthClientId = (data['selectedOauthClientId']) ? data['selectedOauthClientId'] : undefined;
          this.selectedGrantType = (data['selectedGrantType']) ? data['selectedGrantType'] : undefined;
          this.selectedResponseType = (data['selectedResponseType']) ? data['selectedResponseType'] : undefined;
          this.selectedRedirectUri = (data['selectedRedirectUri']) ? data['selectedRedirectUri'] : undefined;

          this.updateAuthorizeUrl();
        },
        error => {
          console.log(error);
        }
      );
  }

  // Utility functions

  updateAuthorizeUrl() {
    this.authorizeUrl = '';
    this.tokenUrl = '';

    this.state = 'mystate';
    this.nonce = 'mynonce';

    let scopes = this.selectedScopes.join(' ');
    let responseTypes = this.getResponseTypeIdentifiers().join(' ');

    this.authorizeUrl =  this.baseUrl + '/oauth2/' + this.selectedAuthServerId + '/v1/authorize' + '?client_id='
      + this.selectedOAuthClientId
      + '&response_type=' + responseTypes + '&scope=' + scopes + '&redirect_uri=' + this.selectedRedirectUri
      + '&state=' + this.state + '&nonce=' + this.nonce; // + '&sessionToken=' + this.sessionToken;

    this.tokenUrl = this.baseUrl + '/oauth2/' + this.selectedAuthServerId + '/v1/token';

  }

  clearResponseMessage() {
    this.responseMessage = undefined;
  }

  clearErrorMessage() {
    this.errorMessage = undefined;
  }

  /*
   * Constructor
   * @param {ActivatedRoute} route
   * @param {HttpClient} http
   */
  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  /*
   * ngOnInit
   */
  ngOnInit() {
    this.loadOktaConfig();
    this.getAuthorizationServers();
    this.getClients();
    this.loadState();
  }

}
