// Тестовый скрипт для проверки API отчета о фазах луны
// Запуск: node test-moon-phase-debug.js

const fetch = require('node-fetch');

async function testMoonPhaseAPI() {
  const baseUrl = 'http://localhost:3000';
  const endpoint = '/n8n/moon-phase-report';
  
  // Тестовые данные
  const testData = {
    telegramId: '1272270574', // Используем тот же ID, что и в ошибке
    language: 'russian'
  };

  try {
    console.log('🔍 Тестируем API отчета о фазах луны...');
    console.log('URL:', baseUrl + endpoint);
    console.log('Данные:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(baseUrl + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-token': 'hjoc83cu1498235lkjclwkjcoiajc02837c421ckljasd' // Используем тот же токен
      },
      body: JSON.stringify(testData)
    });

    console.log('\n📊 Статус ответа:', response.status);
    console.log('📋 Заголовки:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Успешный ответ:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('\n❌ Ошибка:');
      console.log(errorText);
    }
  } catch (error) {
    console.error('💥 Ошибка при выполнении запроса:', error.message);
  }
}

// Проверяем, что сервер запущен
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ Сервер запущен и отвечает');
      return true;
    }
  } catch (error) {
    console.log('❌ Сервер не отвечает. Убедитесь, что он запущен на порту 3000');
    return false;
  }
  return false;
}

// Проверяем переменные окружения
function checkEnvironmentVariables() {
  console.log('🔧 Проверка переменных окружения:');
  console.log('ASTROLOGY_API_USER_ID:', process.env.ASTROLOGY_API_USER_ID ? '✅ Настроен' : '❌ Не настроен');
  console.log('ASTROLOGY_API_KEY:', process.env.ASTROLOGY_API_KEY ? '✅ Настроен' : '❌ Не настроен');
  console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Настроен' : '❌ Не настроен');
  console.log('N8N_TOKEN:', process.env.N8N_TOKEN ? '✅ Настроен' : '❌ Не настроен');
}

async function main() {
  console.log('🚀 Отладка API отчета о фазах луны\n');
  
  // Проверяем переменные окружения
  checkEnvironmentVariables();
  console.log('');
  
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    console.log('\n💡 Запустите сервер командой: npm run dev');
    return;
  }
  
  await testMoonPhaseAPI();
  
  console.log('\n📝 Возможные причины ошибки 500:');
  console.log('1. ❌ Не настроены переменные ASTROLOGY_API_USER_ID или ASTROLOGY_API_KEY');
  console.log('2. ❌ Пользователь с telegramId 1272270574 не найден в базе данных');
  console.log('3. ❌ У пользователя не заполнен профиль (дата рождения, время, местоположение)');
  console.log('4. ❌ Проблемы с подключением к внешнему API');
  console.log('5. ❌ Проблемы с подключением к MongoDB');
  console.log('6. ❌ Ошибки в коде (проверьте логи сервера)');
}

main().catch(console.error);
