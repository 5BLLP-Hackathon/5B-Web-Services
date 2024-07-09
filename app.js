require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const fileUpload = require('express-fileupload');
const path = require('path');

const swaggerDocument = require('./swagger'); // Swagger
const soapservice = require('./soapserver/dvwsuserservice'); // SOAP Service
const rpcserver = require('./rpc_server'); // XMLRPC Server

const { ApolloServer } = require('apollo-server');
const { GqSchema } = require('./graphql/schema');

const app = express();
const router = express.Router();

const routes = require('./routes/index.js');

app.use(express.static('public'));
app.use("/css", express.static(path.join(__dirname, "node_modules/bootstrap/dist/css")));
app.use("/js", express.static(path.join(__dirname, "node_modules/bootstrap/dist/js")));
app.use("/js", express.static(path.join(__dirname, "node_modules/jquery/dist")));
app.use("/js", express.static(path.join(__dirname, "node_modules/angular")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));
app.use('/dvwsuserservice', soapservice);
app.use(bodyParser.json());
app.use(fileUpload({ parseNested: true }));

// Create a write stream for custom logging
const customLogStream1 = require('file-stream-rotator').getStream({
  filename: path.resolve('logs/formatted.log'),
  frequency: 'daily',
  verbose: false,
  max_logs: '2d'
});

// Create a write stream for custom logging
const customLogStream2 = require('file-stream-rotator').getStream({
  filename: path.resolve('logs/raw.log'),
  frequency: 'daily',
  verbose: false,
  max_logs: '2d'
  });

// Custom middleware to log request payload and headers to a file
app.use((req, res, next) => {
  const method = req.method;
  const headers = JSON.stringify(req.headers);
  const body = (() => {
    if (req.is('application/json')) return JSON.stringify(req.body);
    if (req.is('application/x-www-form-urlencoded')) return JSON.stringify(req.body);
    if (req.is('application/octet-stream')) return req.body.toString('hex');
    if (req.is('text/*')) return req.body;
    return '';
  })();
  // const headerJSON = JSON.parse(req.headers);
  // console.log(headerJSON);
  const logEntry = `URL: ${req.headers.host}, UserAgent: ${req.headers['user-agent']}, Cookie: ${req.headers.cookie}, Payload: ${body}\n`;
  customLogStream1.write(logEntry);
  next();
});


// Custom middleware to log request payload and headers to a file
app.use((req, res, next) => {
  const method = req.method;
  const headers = JSON.stringify(req.headers);
  const body = (() => {
    if (req.is('application/json')) return JSON.stringify(req.body);
    if (req.is('application/x-www-form-urlencoded')) return JSON.stringify(req.body);
    if (req.is('application/octet-stream')) return req.body.toString('hex');
    if (req.is('text/*')) return req.body;
    return '';
  })();
  // const headerJSON = JSON.parse(req.headers);
  // console.log(headerJSON);
  const logEntry = `Method: ${method}, URL: ${req.headers.host}, UserAgent: ${req.headers['user-agent']}, Cookie: ${req.headers.cookie}, Payload: ${body}, ContentType: ${req.headers['content-type']}, ContentLanguage: ${req.headers['content-language']}, Origin: ${req.headers.origin}, Authorization: ${req.headers.authorization}, Location: ${req.headers.location}\n`;
  customLogStream2.write(logEntry);
  next();
});

const jwt = require('jsonwebtoken');

const options = {
  expiresIn: '2d',
  issuer: 'https://github.com/dipyamanroy',
  algorithms: ["HS256", "none"],
  ignoreExpiration: true
};

var corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use('/api', routes(router));

// Set default ports if not set in environment variables
const expressPort = process.env.EXPRESS_JS_PORT || 8080;
const graphqlPort = process.env.GRAPHQL_PORT || 4000;

app.listen(expressPort, () => {
  console.log(`🚀 API listening at http://dvws.local${expressPort == 80 ? "" : ":" + expressPort} (127.0.0.1)`);
});

// The ApolloServer constructor requires two parameters: your schema definition and your set of resolvers.
const server = new ApolloServer({
  introspection: true,
  playground: true,
  debug: true,
  allowBatchedHttpRequests: true,
  schema: GqSchema,
  context: async ({ req }) => {
    let verifiedToken = {};
    try {
      const token = req.headers.authorization.split(' ')[1]; // Bearer <token>
      verifiedToken = jwt.verify(token, process.env.JWT_SECRET, options);
    } catch (error) {
      verifiedToken = {};
    }
    return verifiedToken;
  },
});

server.listen({ port: graphqlPort }).then(({ url }) => {
  console.log(`🚀 GraphQL Server ready at ${url}`);
});

module.exports = app;
