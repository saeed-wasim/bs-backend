const jwt = require('jsonwebtoken');

// Orders must always be tied to a real customer, so unlike authRequired this
// does not honor REQUIRE_AUTH=false — that bypass exists for admin-only dev
// convenience, but there's no meaningful "which customer" fallback here.
function customerAuthRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'customer') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.customer = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { customerAuthRequired };
