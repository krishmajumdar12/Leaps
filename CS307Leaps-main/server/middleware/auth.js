const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization').replace('Bearer ', '');
        

        if (!token || token == 'undefined') {
            if (req.allowGuest) {
              req.user = { id: 'guest', isGuest: true };
              return next();
            }
            return res.status(401).json({ message: 'No token, authorization denied' });
          }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user info to request and continue to route
        req.user = decoded;
        next(); 
    } catch (err) {
        if (req.allowGuest) {
            req.user = { id: 'guest', isGuest: true };
            return next();
        }

        res.status(401).json({ message: 'Invalid Token' });
    }
}

module.exports = authMiddleware;