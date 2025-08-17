module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://sistemas-embarcados-7cif.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const { hour, minute, medicine } = req.body;
      
      if (!hour || !minute || !medicine) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }

      return res.status(200).json({ 
        success: true,
        message: 'Alarme adicionado',
        alarm: { hour, minute, medicine }
      });
    }
    
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};