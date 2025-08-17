// /api/alarms.js
module.exports = (req, res) => {
  console.log('✅ API foi chamada!'); // Verifique nos logs do Vercel
  
  return res.status(200).json({ 
    success: true,
    message: 'Teste OK - API funcionando',
    received: req.body
  });
};