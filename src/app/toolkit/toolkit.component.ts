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
  selectedResponseType;
  selectedRedirectUri;

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
 * Get a list of apps
 */
  getApps() {
    this.http.get('/demo/apps')
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
    this.selectedOAuthClientId = oauthClient;
  }

  selectResponseType(responseType) {
    this.selectedResponseType = responseType;
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

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit() {
    this.loadOktaConfig();
    this.getAuthorizationServers();
    this.getApps();
    this.loadState();
  }

}
