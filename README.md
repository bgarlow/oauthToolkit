# OAuth2/OpenID Connect Toolkit
This is a utility app that allows you to interact with the various Authorization Servers and client apps you have configured in your Okta tenant. It was written to make it easier to demonstrate complex use cases involving large sets of scopes, custom claims, complex access policies, etc.

## What does it do?

---
- Uses the Okta APIs to gather information about your Okta tenant, including: all authorization servers and the list of supported scopes that are listed in the public metadata for the auth server (.well-known/oauth-authorization-server) and all OAuth clients and the list of grant types, response types, and redirect URIs they support.
- Allows you to select any combination of authorization server and client and associated options (with easy to use graphical UI) to test or demonstrate authentication use cases.
- Allows you to use the Okta Sign-In Widget (configurable) or redirect using the /authorize and/or /token endpoints
- Displays and decodes the resulting JWTs and includes a TTL timer for each token
- Performs local token validation on the server side for authorization code grant requests using Okta JWT Verifier for Node.JS <https://github.com/okta/okta-oidc-js/tree/master/packages/jwt-verifier>.
- Allows you to invoke the /introspect endpoint to view token status
- Displays all (and allows you to revoke) tokens for the selected client
- Supports authorization code flow with PKCE for demo purposes
- Allows you to directly edit an application's metadata using a JSON editor. Handy for adding redirect URI or profile JSON attribute data
- Supports IDP Discovery
- Supports advanced scoping techniques such as 'right-scoping' user and client credential access tokens. __TODO__ I'll add a link to the repo with instructions for advanced scoping techniques here.

__NOTES__

- This app is designed to make it easy to demonstrate Okta's functionality wrt OAuth 2.0 and OIDC. As such, it does a lot of things you would never do in a real production app, such as displaying client secrets, displaying tokens in the client, exposing /demo APIs that give access to tokens, secrets, API keys, etc.  
- The overall state of the application is maintained in a cookie called "state". If things get weird, consider deleting that cookie and reloading your tenant and API key.
- Status messages and error messages are generally displayed in a panel at the bottom of the page. If something doesn't seem to be working, scroll all the way down and see if there's an error.
- The [+] and [-] icons on the Authorization Servers and OAuth Client sections expand and contract the list to de-clutter the page.
- The API calls to retrieve the Authorization Server and OAuth Clients is pageable. The toolkit app doesn't currently support paging, and will display the first 100 entries. If you have more than that...wow. A good feature for someone to work on would be adding pagination with a smaller limit, say 10 items.

## How does it work?

---
The app requires an Okta API key in order to make various API calls (get the list of auth servers and clients, update application metadata, etc.). The current state of the application--the selected authorization server and client, the selected grant type, redirect URI, etc. are all stored in a cookie called "state". Any time you select a new option, the state of the application is updated in that cookie. You can always click "save" to save the current state as well.

You'll need to configure your apps with the redirect URI of the Toolkit application. You can add the redirect URI to the application in Okta, or you can click on the _Edit_ button for the selected app, and add the redirect URI directly to the application's JSON definition. By default, implicit flow should redirect to http://localhost:4200/tookit, and authorization code flow should redirect to the Node backend on http://localhost:4200/demo/authorization-code/callback.

Tokens are stored in HTTP-only cookies managed by the Node backend. 
## Installation

---
The Toolkit app requires Node Express and Angular. It was written in Node 8.9.1, Express 4.15.5 and Angular CLI 1.7.2, Angular 5.2.7.

Clone this Github repository [bgarlow/demo6](https://github.com/bgarlow/demo6) _TODO: I'll rename the repo once we settle on a name for the app...

Run this command in a terminal window to install the application:
```
npm install
```
## Start the Application

__TODO: I'll remove proxy.conf.js so that this all runs on a single port instead of NG and Node on separate ports

While it is under development, the application is configured to run on two separate ports. The Angular app runs on port 4200, and the Node Express app runs on port 3000. This makes development and testing more efficient because you don't have to build the entire Angular project each time you make a change. 

##### Run the Node server
```
node server.js
```

##### In a separate terminal window, run the Angular server
This will build the project and run the server:
```
npm start
```
---
##Configure the Toolkit for your Okta Org
![Okta Config](https://github.com/bgarlow/demo6/raw/master/src/assets/okta_config.png)

1. Enter the base URL of your Okta tenant (https://myorg.okta.com)
2. Enter an API key from your Okta tenant
3. Click on the __Load__ button

This should load your authorization servers..

![Auth Servers](https://github.com/bgarlow/demo6/raw/master/src/assets/auth_servers.png)
.. and OAuth clients.
![OAuth Clients](https://github.com/bgarlow/demo6/raw/master/src/assets/oauth_clients.png)

__Note:__ The toolkit app is using the following Okta API endpoints to load this data:

__GET__ [/api/v1/authorizationServers](https://developer.okta.com/docs/api/resources/authorization-servers#create-authorization-server)

__GET__ [/api/v1/authorizationServers/${authServerId}](https://developer.okta.com/docs/api/resources/authorization-servers#get-authorization-server)

__GET__ [/api/v1/authorizationServers/${authorizationServerId}/clients](https://developer.okta.com/docs/api/resources/authorization-servers#list-client-resources-for-an-authorization-server)

__GET__ [/api/v1/apps/${applicationId}](https://developer.okta.com/docs/api/resources/apps#get-application)

__Note:__ The Applications API will not return the client secret, so you will need to copy and paste the client secret from Okta for any OAuth clients you want to use with authorization code or client credentials grant type.
___
###Select an Authorization Server and Client
Select the authorization server and client you want to work with. The authorization server will display the scopes it supports, which you can select/deselect by clicking on the the chicklets. The list of scopes is pulled from the public metadata for the authorization server (https://{yourOktaDomain}/oauth2/${authServerId}/.well-known/oauth-authorization-server). Only scopes marked for "Metadata Publish" in Okta will appear in the list.
![Auth Server and Client](https://github.com/bgarlow/demo6/raw/master/src/assets/server_client.png)

####Authorization Server
This panel displays the Authorization Server name, description and ID. The __Metadata__ button will call the selected auth server's metadata URI and display the JSON response in a panel at the bottom of the page. You may have to scroll down to see it. 

You can select/deselect scopes by clicking on the corresponding chicklet. The __clr scp__ button will de-select all scopes. If already have an access token, the scopes contained in that token will appear highlighted. You can request a new access token with different scopes by simply clicking on the new scopes you want and clicking on the button to call the /authorize endpoint again. The new request (and Sign-in Widget configuration) are automatically updated when you click on scope chicklets.

####OAuth Client
This panel displays the client name, application type, and ID. It also displays the grant types, response types, and redirect URIs supported by the client. You can select any valid combination of these to build a new auth request.

__Note:__ 
- If you want to use authorization code flow, you need to configure the client to redirect to the callback handler of the toolkit app, e.g. <http://localhost:4200/toolkit/authorization-code/callback>
_ Otherwise configure your app to redirect to the toolkit's front-end <http://localhost:4200/toolkit>, which will retrieve tokens from the URL fragment.
- You can add the redirect URI to the app in Okta, or you can click the __Edit__ button and manually add the new redirect_uri parameter using the JSON editor.

__Note:__ The Okta API that is used to populate the OAuth Client panel with information about the client does not return the client secret (if applicable). You will need to manually copy and paste the client secret into the client secret field and click the "Save" button to store the client secret in the __cachedClients__ cookie, which is used by the toolkit app to maintain a list of OAuth client with their secrets.

The __Tokens__ button will display a list of all refresh tokens for this client. You can revoke all tokens, or select individual tokens to revoke. This is useful for demonstrating various token lifecycle operations and refresh token flows. Clicking on the __Expand token info with expand=scope__ checkbox will display the scopes associated with the token.
![Tokens](https://github.com/bgarlow/demo6/raw/master/src/assets/tokens.png)

The __Grants__ button will display a list of all scope grants the end user has consented to during authorization. You can revoke all grants, or individually revoke grants. This can be useful for demonstrating how user consent works with API Access Management.
![Grants](https://github.com/bgarlow/demo6/raw/master/src/assets/grants.png)


###Authenticate and Retrieve Tokens
The toolkit provides several ways to authenticate, depending on the selected client and grant type. For flows that involve an end-user (authorization code, authorization code with PKCE, implicit and resource owner password) the following are supported

__Note:__ Most of the UX controls in the toolkit are 2-way bound to the underlying data model. So, if you were to select a new scope by clicking on the chicklet in the authorization server section, that scope will automatically be added to the the OAuth /authorize endpoint wherever else it is used (in the sign-in widget, the redirect to Okta, etc.). 

####Okta Sign-In Widget

![Sign-In Widget](https://github.com/bgarlow/demo6/raw/master/src/assets/widget_config.png)

This is the Okta Sign-In widget available at <https://github.com/okta/okta-signin-widget>. The JSON editor <https://github.com/josdejong/jsoneditor> component below the Sign-In Widget shows the current configuration of the widget, which is dynamically updated as other controls (selected scopes, selected clients, etc.) are updated. You can use the JSON editor to change the overall configuration of the widget, to do things like turning on features (self service registration, IDP discovery, etc.). CSS changes are not currently supported.

If the widget isn't visible, click the __Update Widget__ button to refresh it. If you mess up the configuration and want to revert to the original widget configuration, click the __Reset Widget__ button. 

####Redirect to Okta Sign In

![Redirect to Okta](https://github.com/bgarlow/demo6/raw/master/src/assets/redirect.png)

This will redirect you to the sign in page of the configured Okta org, where you will sign in and be redirected back to the selected redirectUri. The redirect goes to the /authorize endpoint of the Okta org <https://developer.okta.com/docs/api/resources/oidc#authorize>. If you are using authorization code flow, after logging in the __Last Code Exchange__field will display the POST message payload used to exchange the authorization code for tokens on the back end. 

![Last Auth Code Exchange](https://github.com/bgarlow/demo6/raw/master/src/assets/lastcodeexchange.png)

__Note:__ This flow supports PKCE. If you click the __PKCE__ button in a client application, a code challenge and code verifier will be generated for the request. This allows you to demonstrate authorization code flow with PCKE without having to use a mobile app.

####Okta Authentication API

![Authentication API](https://github.com/bgarlow/demo6/raw/master/src/assets/authn.png)

This flow is typical of a custom login page that doesn't use the Okta Auth Javascript SDK <https://github.com/okta/okta-auth-js>. The custom form collects the username and password, and calls the Okta Authentication API, which returns a session token. The app then redirects to the /authorize endpoint to exchange the session token for tokens, completing the flow. If you are using authorization code flow, after logging in the __Last Session Token Exchange__field will display the GET URL used to exchange the one-time session token for tokens on the back end. 

![Last Session Token Exchange](https://github.com/bgarlow/demo6/raw/master/src/assets/lastsession.png)

####Token Endpoint

If you have selected client credential grant type, the Token Endpoint panel will be displayed, allowing you to retrieve tokens via the /token endpoint. __Note__ the toolkit app is current configured to send client_id and client_secret as request parameters, rather than in the Basic Authorization header as a combined hash value. 

![Token Endpoint](https://github.com/bgarlow/demo6/raw/master/src/assets/token_endpoint.png)

### Review your Tokens

Depending on what response type you selected, you should panels for each of the tokens returned. The raw JWT is displayed, along with a the decoded version and some other relevant information, such as issued at and expiry time and a countdown TTL timer. The timer is useful if you want to set up really short lifetimes for demonstrating the refresh token flow, etc.

#### Access Token

![Access Token](https://github.com/bgarlow/demo6/raw/master/src/assets/access_token.png)

You can call the /introspect and /userinfo endpoints as well as revoke the token. The URL of each of those API calls is displayed as well.

#### ID Token

![ID Token](https://github.com/bgarlow/demo6/raw/master/src/assets/id_token.png)

You can call the /introspect endpoint with the ID token.

#### Refresh Token

![Refresh Token](https://github.com/bgarlow/demo6/raw/master/src/assets/refresh_token.png)

You can call the /introspect endpoint with the refresh token as well as revoke the token.









