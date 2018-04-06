import {Component, OnInit} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-toolkit',
  templateUrl: './toolkit.component.html',
  styleUrls: ['./toolkit.component.css']
})

export class ToolkitComponent implements OnInit {

  baseUrl;
  unsafeApiKey;
  state;
  nonce;
  authorizationServers;
  oAuthClients;
  authorizeUrl;
  tokenUrl;

  selectedAuthServerId;
  selectedOAuthClientId;
  selectedOAuthClient;
  selectedApp;
  selectedAppProfile;
  selectedGrantType;
  selectedResponseType = [];
  selectedRedirectUri;
  selectedScopes;
  supportedScopes;
  scopesClaim;

  showAppProfile = false;

  errorMessage;
  successMessage;
  metadataEndpoint;
  metadataResponse;
  responseMessage;

  authUrlValid;
  tokenUrlValid;

  getMetadata(authServer, display) {

    if (typeof authServer === 'string') {
      this.metadataEndpoint = this.baseUrl + '/oauth2/' + authServer + '/.well-known/oauth-authorization-server';
    } else {
      this.metadataEndpoint = this.baseUrl + '/oauth2/' + authServer.id + '/.well-known/oauth-authorization-server';
    }

    this.http.get(this.metadataEndpoint)
      .subscribe(
        data => {
          if (display) {
            this.metadataResponse = data;
          }
          this.supportedScopes = data['scopes_supported'];
        },
        error => {
          this.errorMessage = error;
        });
  }

  /**
   * Get a list of the authorization servers configured in this Okta instance
   */
  getAuthorizationServers(): Observable<any> {
    return this.http.get('/demo/authorizationServers');
  }

/**
 * Get a list of OAuth clients
 */
  getClients(): Observable<any> {
    return this.http.get('/demo/clients');
  }

  /**
   * Selected auth server
   */
  selectAuthServer(authServer) {
    this.selectedAuthServerId = authServer.id;
    this.getMetadata(authServer, false);
    this.updateAuthorizeUrl();
  }

  /**
   * @param oauthClient
   */
  selectOAuthClient(oauthClient) {
    this.selectedOAuthClientId = oauthClient.client_id;
    this.selectedOAuthClient = oauthClient;
    this.selectedApp = undefined;
    this.selectedAppProfile = undefined;

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

  selectScope(scope) {
    const scopeArray = (this.selectedScopes) ? this.selectedScopes : [];
    if (!scopeArray.includes(scope)) {
      scopeArray.push(scope);
    } else {
      const index = scopeArray.indexOf(scope);
      if (index > -1) {
        scopeArray.splice(index, 1);
      }
    }
    this.selectedScopes = scopeArray;
    this.updateAuthorizeUrl();
  }

  /**
   * update the OAuth client app
   * @param app
   */
  updateAppProfile(oauthClient) {

    const profile = JSON.parse(this.selectedAppProfile);
    this.selectedApp.profile = profile;

    this.http.post('/demo/apps/' + oauthClient.client_id, this.selectedApp)
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
          this.selectedApp = JSON.parse(data['body'].toString());
          this.selectedAppProfile = this.selectedApp.profile ? JSON.stringify(this.selectedApp.profile, undefined, 2) : JSON.stringify({}, undefined, 2);
        },
        error => {
          this.errorMessage = error;
        }
      );
  }

  /**
   * post our current state variables to node back end, stuff them in a cookie
   */
  saveState() {

    const payload = {
      state: {
        baseUrl: this.baseUrl,
        unsafeApiKey: this.unsafeApiKey,
        selectedAuthServerId: this.selectedAuthServerId,
        selectedOauthClientId: this.selectedOAuthClientId,
        selectedScopes: this.selectedScopes,
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
          this.baseUrl = (data['baseUrl']) ? data['baseUrl'] : undefined;
          this.unsafeApiKey = (data['unsafeApiKey']) ? data['unsafeApiKey'] : undefined;
          this.selectedAuthServerId = (data['selectedAuthServerId']) ? data['selectedAuthServerId'] : this.authorizationServers[0];
          this.selectedOAuthClientId = (data['selectedOauthClientId']) ? data['selectedOauthClientId'] : this.oAuthClients[0];
          this.selectedScopes = (data['selectedScopes']) ? data['selectedScopes'] : this.selectedScopes;
          this.selectedGrantType = (data['selectedGrantType']) ? data['selectedGrantType'] : this.oAuthClients[0].grant_types[0];
          this.selectedResponseType = (data['selectedResponseType']) ? data['selectedResponseType'] : this.oAuthClients[0].response_types[0];
          this.selectedRedirectUri = (data['selectedRedirectUri']) ? data['selectedRedirectUri'] : this.oAuthClients[0].redirect_uris[0];

          this.updateAuthorizeUrl();
          this.getMetadata(this.selectedAuthServerId, false);
        },
        error => {
          console.log(error);
        }
      );
  }

  // Utility functions

  updateAuthorizeUrl() {
    this.authUrlValid = false;
    this.authorizeUrl = '';
    this.tokenUrl = '';

    this.state = 'mystate';
    this.nonce = 'mynonce';

    let scopes =  this.selectedScopes ? this.selectedScopes.join(' ') : undefined;
    let responseTypes = this.getResponseTypeIdentifiers().join(' ');

    this.authUrlValid = this.baseUrl && this.selectedAuthServerId && this.selectedOAuthClientId && responseTypes && scopes && this.selectedRedirectUri && this.state && this.nonce;

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

  clearCurrentOrgConfig() {
    this.selectedAuthServerId = undefined;
    this.selectedOAuthClientId = undefined;
    this.selectedGrantType = undefined;
    this.selectedResponseType = undefined;
    this.selectedScopes = undefined;
    this.selectedRedirectUri = undefined;
  }

  reload() {
    // clear current org values
    this.clearCurrentOrgConfig();
    this.saveState();
    this.getAuthorizationServers();
    this.getClients();
    this.loadState();
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
    this.getAuthorizationServers()
      .subscribe(
        data => {
          this.authorizationServers = JSON.parse(data.toString());
          this.getClients()
            .subscribe(
              data => {
                this.oAuthClients = JSON.parse(data.toString());
                this.loadState();
              }
            );
        }
      );
    }

}
