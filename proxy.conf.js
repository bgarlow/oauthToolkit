const PROXY_CONFIG = [
  {
    context: [
      "/api",
      "/demo"
    ],
    target: "http://localhost:3000",
    secure: false
  }
]

module.exports = PROXY_CONFIG;