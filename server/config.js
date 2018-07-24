const oktaTenant = process.env.OKTA_TENANT;
const oktaDomain = process.env.OKTA_DOMAIN;
const oktaApiKey = process.env.OKTA_API_KEY;

// Expose configuration to the app
module.exports = {

  // only expose this on the server side
  oktaSecret: {
    oktaApiKey: oktaApiKey
  },

  oktaConfig: {
    oktaTenant: oktaTenant,
    oktaDomain: oktaDomain
  }
  
};
