// Скрипт для проверки формата даты пользователя
// Запуск: node check-user-date.js

const { MongoClient } = require('mongodb');

async function checkUserDate() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/newbotksenia';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Подключен к MongoDB');

    const db = client.db('newbotksenia');
    const users = db.collection('users');

    // Ищем пользователя с telegramId 1272270574
    const user = await users.findOne({ telegramId: '1272270574' });

    if (!user) {
      console.log('❌ Пользователь с telegramId 1272270574 не найден');
      return;
    }

    console.log('📋 Данные пользователя:');
    console.log('telegramId:', user.telegramId);
    console.log('birthDate:', user.birthDate);
    console.log('birthHour:', user.birthHour);
    console.log('birthMinute:', user.birthMinute);
    console.log('lastGeocode:', user.lastGeocode);

    if (user.birthDate) {
      console.log('\n🔍 Анализ формата даты:');
      console.log('Тип birthDate:', typeof user.birthDate);
      console.log('Длина строки:', user.birthDate.length);
      console.log('Содержит дефисы:', user.birthDate.includes('-'));
      console.log('Содержит точки:', user.birthDate.includes('.'));
      console.log('Содержит слеши:', user.birthDate.includes('/'));
      
      // Проверяем различные форматы
      const formats = [
        /^\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}$/, // YYYY-MM-DD
        /^\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}$/, // DD-MM-YYYY
        /^\d{1,2}\.\d{1,2}\.\d{4}$/, // DD.MM.YYYY
        /^\d{4}\.\d{1,2}\.\d{1,2}$/, // YYYY.MM.DD
      ];

      console.log('\n📝 Проверка форматов:');
      formats.forEach((format, index) => {
        const matches = format.test(user.birthDate);
        console.log(`Формат ${index + 1}: ${matches ? '✅' : '❌'} - ${format.source}`);
      });
    }

  } catch (error) {
    console.error('💥 Ошибка:', error);
  } finally {
    await client.close();
  }
}

checkUserDate().catch(console.error);
