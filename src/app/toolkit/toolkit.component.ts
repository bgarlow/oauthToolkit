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
            console.error(`/token ${data}`);
            this.errorMessage = data;
          }
        }
      );
  }

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
    this.getAuthServerMetadata(authServer, false);
    this.toolkit.updateAuthorizeUrl();
  }

  /**
   * @param oauthClient
   */
  selectOAuthClient(oauthClient) {
    this.toolkit.selectedOAuthClientId = oauthClient.client_id;
    this.toolkit.selectedOAuthClient = oauthClient;
    this.toolkit.selectedApp = undefined;
    this.toolkit.selectedAppProfile = undefined;

    if (oauthClient.grant_types.length < 2) {
      this.toolkit.selectedGrantType = oauthClient.grant_types[0];
    }

    if (oauthClient.redirect_uris.length < 2) {
      this.toolkit.selectedRedirectUri = oauthClient.redirect_uris[0];
    }

    this.toolkit.selectedResponseType = [];
    for (let type of oauthClient.response_types) {
      this.toolkit.selectedResponseType.push({
        type: type,
        selected: true
      });
    }

    this.toolkit.updateAuthorizeUrl();
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
   * post our current state variables to node back end, stuff them in a cookie
   */
  saveState() {

    const payload = {
      state: {
        baseUrl: this.toolkit.baseUrl,
        unsafeApiKey: this.toolkit.unsafeApiKey,
        selectedAuthServerId: this.toolkit.selectedAuthServerId,
        selectedOauthClientId: this.toolkit.selectedOAuthClientId,
        selectedScopes: this.toolkit.selectedScopes,
        selectedResponseType: this.toolkit.selectedResponseType,
        selectedGrantType: this.toolkit.selectedGrantType,
        selectedRedirectUri: this.toolkit.selectedRedirectUri
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
          this.toolkit.baseUrl = (data['baseUrl']) ? data['baseUrl'] : undefined;
          this.toolkit.unsafeApiKey = (data['unsafeApiKey']) ? data['unsafeApiKey'] : undefined;
          this.toolkit.selectedAuthServerId = (data['selectedAuthServerId']) ? data['selectedAuthServerId'] : this.toolkit.authorizationServers[0];
          this.toolkit.selectedOAuthClientId = (data['selectedOauthClientId']) ? data['selectedOauthClientId'] : this.toolkit.oAuthClients[0];
          this.toolkit.selectedScopes = (data['selectedScopes']) ? data['selectedScopes'] : this.toolkit.selectedScopes;
          this.toolkit.selectedGrantType = (data['selectedGrantType']) ? data['selectedGrantType'] : this.toolkit.oAuthClients[0].grant_types[0];
          this.toolkit.selectedResponseType = (data['selectedResponseType']) ? data['selectedResponseType'] : this.toolkit.oAuthClients[0].response_types[0];
          this.toolkit.selectedRedirectUri = (data['selectedRedirectUri']) ? data['selectedRedirectUri'] : this.toolkit.oAuthClients[0].redirect_uris[0];

          this.toolkit.updateAuthorizeUrl();
          this.getAuthServerMetadata(this.toolkit.selectedAuthServerId, false);
        },
        error => {
          console.log(error);
        }
      );
  }

  // Utility functions



  clearCurrentOrgConfig() {
    this.toolkit.selectedAuthServerId = undefined;
    this.toolkit.selectedOAuthClientId = undefined;
    this.toolkit.selectedGrantType = undefined;
    this.toolkit.selectedResponseType = undefined;
    this.toolkit.selectedScopes = undefined;
    this.toolkit.selectedRedirectUri = undefined;
  }

  reload() {
    // clear current org values
    this.clearCurrentOrgConfig();
    this.saveState();
    this.toolkit.getAuthorizationServers();
    this.toolkit.getClients();
    this.loadState();
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
    this.toolkit.getAuthorizationServers()
      .subscribe(
        data => {
          this.toolkit.authorizationServers = JSON.parse(data.toString());
          this.toolkit.getClients()
            .subscribe(
              data => {
                this.toolkit.oAuthClients = JSON.parse(data.toString());
                this.loadState();
              }
            );
        }
      );
    }

}
