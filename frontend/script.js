const BLYNK_TOKEN = "7VXnkSGWGjm878MVradiOE3-6pcE2lsu";

const addAlarmBtn = document.getElementById('addAlarmBtn');
const cancelAllBtn = document.getElementById('cancelAllBtn');
const alarmTimeInput = document.getElementById('alarmTime');
const alarmDescInput = document.getElementById('alarmDesc');
const alarmsList = document.getElementById('alarmsList');
const statusMessage = document.getElementById('statusMessage');

async function callBlynkAPI(action, pin, value = null) {
  let url;
  if (action === 'get') {
    url = `https://blynk.cloud/external/api/get?token=${BLYNK_TOKEN}&${pin}`;
  } else {
    url = `https://blynk.cloud/external/api/update?token=${BLYNK_TOKEN}&${pin}=${value}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro na API');
    return await response.text();
  } catch (error) {
    showStatus(`Erro: ${error.message}`, 'error');
    return null;
  }
}

addAlarmBtn.addEventListener('click', async () => {
  const time = alarmTimeInput.value;
  const desc = alarmDescInput.value;

  if (!time || !desc) {
    showStatus('Preencha todos os campos!', 'error');
    return;
  }

  const [hours, minutes] = time.split(':');
  await callBlynkAPI('update', 'V1', hours);
  await callBlynkAPI('update', 'V2', minutes);
  await callBlynkAPI('update', 'V3', desc);
  await callBlynkAPI('update', 'V4', '1');

  alarmsList.innerHTML += `
    <li class="alarm-item">
      <span>${time} - ${desc}</span>
    </li>
  `;

  showStatus('Alarme adicionado com sucesso!', 'success');
  alarmTimeInput.value = '';
  alarmDescInput.value = '';
});

cancelAllBtn.addEventListener('click', async () => {
  await callBlynkAPI('update', 'V7', '1');
  alarmsList.innerHTML = '';
  showStatus('Todos os alarmes foram cancelados', 'success');
});

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.style.color = type === 'error' ? '#e74c3c' : '#2ecc71';
  setTimeout(() => statusMessage.textContent = '', 3000);
}