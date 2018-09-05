# OAuth2/OpenID Connect Toolkit
This is a utility app that allows you to interact with the various Authorization Servers and client apps you have configured in your Okta tenant. It was written to make it easier to demonstrate complex use cases involving large sets of scopes, custom claims, complex access policies, etc.

## What does it do?

---
- Uses the Okta APIs to gather information about your Okta tenant, including: all authorization servers and the list of supported scopes that are listed in the public metadata for the auth server (.well-known/oauth-authorization-server) and all OAuth clients and the list of grant types, response types, and redirect URIs they support.
- Allows you to select any combination of authorization server and client and associated options (with easy to use graphical UI) to test or demonstrate authentication use cases.
- Allows you to use the Okta Sign-In Widget (configurable) or redirect using the /authorize and/or /token endpoints
- Displays and decodes the resulting JWTs and includes a TTL timer for each token
- Performs local token validation on the server side for authorization code grant requests
- Allows you to invoke the /introspect endpoint to view token status
- Displays all (and allows you to revoke) tokens for the selected client
- Supports authorization code flow with PKCE for demo purposes
- Allows you to directly edit an application's metadata using a JSON editor. Handy for adding redirect URI or profile JSON attribute data
- Supports IDP Discovery
- Supports advanced scoping techniques such as 'right-scoping' user and client credential access tokens __TODO: add links to docs here__
## How does it work?

---
The app requires an Okta API key in order to make various API calls (get the list of auth servers and clients, update application metadata, etc.). The current state of the application--the selected authorization server and client, the selected grant type, redirect URI, etc. are all stored in a cookie called "state". Any time you select a new option, the state of the application is updated in that cookie. You can always click "save" to save the current state as well.

You'll need to configure your apps with the redirect URI of the Toolkit application. You can add the redirect URI to the application in Okta, or you can click on the _Edit_ button for the selected app, and add the redirect URI directly to the application's JSON definition. By default, implicit flow should redirect to http://localhost:4200/tookit, and authorization code flow should redirect to the Node backend on http://localhost:4200/demo/authorization-code/callback.

Tokens are stored in HTTP-only cookies managed by the Node backend. 
## Installation

---
The Toolkit app requires Node Express and Angular. It was written in Node 8.9.1, Express 4.15.5 and Angular CLI 1.7.2, Angular 5.2.7.

Clone this Github repository [bgarlow/demo6](https://github.com/bgarlow/demo6) _TODO: Rename the repo__

Run this command in a terminal window to install the application:
```
npm install
```
## Start the Application

__TODO: add screen shots
__TODO: remove proxy.conf.js so that this all runs on a single port

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
##Configure and Use the Application
1. Enter the base URL of your Okta tenant (https://myorg.okta.com)
2. Enter an API key from your Okta tenant
3. Click on the __Load__ button

This should load your authorization servers and OAuth clients
