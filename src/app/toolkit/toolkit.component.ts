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
  authorizationServers;
  oAuthClients;

  selectedAuthServerId;
  selectedOAuthClientId;
  selectedGrantType;
  selectedResponseType = [];
  selectedRedirectUri;

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

  selectAuthServer(authServer) {
    this.selectedAuthServerId = authServer;
  }

  selectOAuthClient(oauthClient) {
    this.selectedOAuthClientId = oauthClient.client_id;
    if (oauthClient.grant_types.length < 2) {
      this.selectedGrantType = oauthClient.grant_types[0];
    }
    if (this.selectedResponseType.length > oauthClient.response_types.length) {
      this.selectedResponseType = oauthClient.response_types;
    }
  }

  selectResponseType(responseType) {

    let type = responseType.toString();

    if (this.selectedResponseType && this.selectedResponseType.includes(type)) {
      const index = this.selectedResponseType.indexOf(type, 0);
      if (index > -1) {
        this.selectedResponseType.splice(index, 1);
      }
    } else {
      this.selectedResponseType.push(type);
    }
  }

  selectGrantType(grantType) {
    this.selectedGrantType = grantType;
  }

  selectRedirectUri(redirectUri) {
    this.selectedRedirectUri = redirectUri;
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
        },
        error => {
          console.log(error);
        }
      );
  }

  clearResponseMessage() {
    this.responseMessage = undefined;
  }

  clearErrorMessage() {
    this.errorMessage = undefined;
  }

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit() {
    this.loadOktaConfig();
    this.getAuthorizationServers();
    this.getClients();
    this.loadState();
  }

}
