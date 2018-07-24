const PROXY_CONFIG = [
  {
    context: [
      "/api",
      "/demo"
    ],
    target: "https://oauthtoolkit.herokuapp.com", //"http://localhost:3000",
    secure: false
  }
];

module.exports = PROXY_CONFIG;
