const jwt = require('jsonwebtoken');

module.exports = {
  validateToken: (req, res, next) => {
    const authorizationHeaader = req.headers.authorization;
    let result;
    if (authorizationHeaader) {
      let token = req.headers.authorization.split(' ')[1]; // Bearer <token>
      const options = {
        expiresIn: '1d',
        issuer: 'https://github.com/dipyamanroy',
        algorithms: ["HS256", "none"],
        ignoreExpiration: false
      };
      try {
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        req.decoded = result;
        next();
      } catch (err) {
        res.status(401).send(err);
        //throw new Error(err);
      }
    } else if (req.cookies.token) {
      let token = req.cookies.token; // Bearer <token>
      const options = {
        expiresIn: '1d',
        issuer: 'https://github.com/dipyamanroy',
        algorithms: ["HS256", "none"],
        ignoreExpiration: false
      };
      try {
        result = jwt.verify(token, process.env.JWT_SECRET, options);
        req.decoded = result;
        next();
      } catch (err) {
        res.status(401).send(err);
        //throw new Error(err);
      }
    } 
    else {
      result = {
        error: `Authentication error. Token required.`,
        status: 401
      };
      res.status(401).send(result);
    }
  }
};