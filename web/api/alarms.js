module.exports = async (req, res) => {
  // Configuração de CORS para permitir requisições de diferentes origens
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Lidar com requisições OPTIONS para CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar o método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      message: 'Use POST para adicionar alarmes'
    });
  }

  try {
    // Verificar se o corpo da requisição está presente
    if (!req.body) {
      return res.status(400).json({ 
        error: 'Dados faltando',
        message: 'O corpo da requisição está vazio'
      });
    }

    const { hour, minute, medicine } = req.body;

    // Validação dos dados
    if (hour === undefined || minute === undefined || !medicine) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        message: 'Forneça hour, minute e medicine'
      });
    }

    if (isNaN(hour) || hour < 0 || hour > 23) {
      return res.status(400).json({ 
        error: 'Hora inválida',
        message: 'A hora deve estar entre 0 e 23'
      });
    }

    if (isNaN(minute) || minute < 0 || minute > 59) {
      return res.status(400).json({ 
        error: 'Minuto inválido',
        message: 'O minuto deve estar entre 0 e 59'
      });
    }

    if (typeof medicine !== 'string' || medicine.length > 30) {
      return res.status(400).json({ 
        error: 'Medicamento inválido',
        message: 'O nome do medicamento deve ter até 30 caracteres'
      });
    }

    // Simular armazenamento em banco de dados
    const newAlarm = {
      id: Date.now(),
      hour,
      minute,
      medicine,
      createdAt: new Date().toISOString()
    };

    console.log('Novo alarme adicionado:', newAlarm);

    // Resposta de sucesso
    return res.status(201).json({
      success: true,
      message: 'Alarme adicionado com sucesso',
      alarm: newAlarm
    });

  } catch (error) {
    console.error('Erro no servidor:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Ocorreu um erro ao processar sua requisição'
    });
  }
};