const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  // Ambil token dari header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: "Akses ditolak. Token tidak ditemukan." });
  }

  try {
    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Simpan data user (id, role) ke request
    next();
  } catch (error) {
    res.status(400).json({ error: "Token tidak valid atau sudah kedaluwarsa." });
  }
};

module.exports = authenticate;