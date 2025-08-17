// api/alarms.js (versão teste simplificada)
module.exports = async (req, res) => {
  console.log('✅ Endpoint /api/alarms foi chamado!'); // Aparecerá nos logs do Vercel
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Simula processamento bem-sucedido
  const responseData = {
    success: true,
    message: 'Alarme recebido (modo teste)',
    receivedData: req.body // Mostra os dados recebidos
  };

  console.log('📦 Dados recebidos:', req.body); // Log para depuração
  
  return res.status(200).json(responseData);
};