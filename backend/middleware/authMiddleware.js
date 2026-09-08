const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret'); // Clave unificada
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        res.status(401);
        return next(new Error('No autorizado, el usuario ya no existe'));
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      return next(new Error('No autorizado, el token falló'));
    }
  } else {
    res.status(401);
    return next(new Error('No autorizado, no hay token'));
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    return next(new Error('No autorizado como administrador'));
  }
};

module.exports = { protect, admin };
