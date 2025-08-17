// api/alarms.js (versão teste)
console.log('✅ alarms.js carregado!'); // Verifique nos logs

module.exports = (req, res) => {
  console.log('📦 Dados recebidos:', req.body);
  return res.status(200).json({ 
    success: true,
    message: 'API funcionando!',
    body: req.body
  });
};