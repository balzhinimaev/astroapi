# API Отчета о Фазах Луны

## Описание

Добавлен новый API endpoint для получения астрологического отчета о фазах луны на основе данных пользователя. API использует внешний сервис [Astrology API](https://json.astrologyapi.com/v1/moon_phase_report) для получения астрологических данных.

## Установка и настройка

### 1. Переменные окружения

Добавьте в ваш `.env` файл следующие переменные:

```bash
# Астрологический API
ASTROLOGY_API_USER_ID=ваш_user_id
ASTROLOGY_API_KEY=ваш_api_key
```

### 2. Получение API ключей

1. Зарегистрируйтесь на [Astrology API](https://astrologyapi.com/)
2. Получите `User ID` и `API Key`
3. Добавьте их в переменные окружения

## Использование API

### Endpoint

```
POST /n8n/moon-phase-report
```

### Заголовки

```
Authorization: Bearer YOUR_N8N_TOKEN
Content-Type: application/json
```

### Тело запроса

```json
{
  "telegramId": "123456789",
  "language": "russian"
}
```

**Параметры:**
- `telegramId` (обязательный) - ID пользователя в Telegram
- `language` (опциональный) - язык отчета (по умолчанию "russian")

### Ответ

**Успешный ответ (200):**
```json
{
  "ok": true,
  "report": {
    "moon_phase_report": [
      "Отчет о фазах луны для указанной даты и времени рождения...",
      "Дополнительная астрологическая информация..."
    ]
  }
}
```

**Ошибки:**
- `400` - Профиль пользователя неполный
- `404` - Пользователь не найден
- `500` - Внутренняя ошибка сервера

## Требования к профилю пользователя

Для получения отчета у пользователя должны быть заполнены:

- `birthDate` - дата рождения в формате YYYY-MM-DD
- `birthHour` - час рождения (0-23)
- `birthMinute` - минута рождения (0-59)
- `lastGeocode.lat` - широта местоположения
- `lastGeocode.lon` - долгота местоположения
- `lastGeocode.tzone` - часовой пояс (смещение от UTC в часах)

## Примеры использования

### cURL

```bash
curl -X POST http://localhost:3000/n8n/moon-phase-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_N8N_TOKEN" \
  -d '{
    "telegramId": "123456789",
    "language": "russian"
  }'
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/n8n/moon-phase-report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_N8N_TOKEN'
  },
  body: JSON.stringify({
    telegramId: '123456789',
    language: 'russian'
  })
});

const result = await response.json();
console.log(result);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/n8n/moon-phase-report',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_N8N_TOKEN'
    },
    json={
        'telegramId': '123456789',
        'language': 'russian'
    }
)

result = response.json()
print(result)
```

## Тестирование

Для тестирования API используйте файл `test-moon-phase.js`:

```bash
# Установите зависимости (если нужно)
npm install node-fetch

# Запустите тест
node test-moon-phase.js
```

**Перед запуском теста:**
1. Убедитесь, что сервер запущен (`npm run dev`)
2. Настройте переменные окружения
3. Замените `YOUR_N8N_TOKEN_HERE` на реальный токен
4. Убедитесь, что у пользователя заполнен профиль

## Архитектура

### Файлы

- `src/services/astrologyApi.ts` - Основная логика работы с астрологическим API
- `src/routes/n8n.ts` - HTTP endpoint для получения отчета
- `src/models/User.ts` - Модель пользователя с данными для отчета

### Функции

- `getMoonPhaseReport()` - Базовая функция для вызова внешнего API
- `getMoonPhaseReportByTelegramId()` - Функция для получения отчета по telegramId пользователя

### Обработка ошибок

API корректно обрабатывает следующие ошибки:
- Отсутствие пользователя
- Неполный профиль пользователя
- Ошибки внешнего API
- Проблемы с подключением к базе данных

## Безопасность

- Все запросы защищены middleware `requireN8nToken`
- API ключи хранятся в переменных окружения
- Валидация входных данных
- Обработка ошибок без утечки чувствительной информации

## Мониторинг и логирование

Все запросы к API логируются с указанием:
- Времени запроса
- Параметров запроса
- Статуса ответа
- Ошибок (если есть)

## Поддержка

При возникновении проблем:

1. Проверьте логи сервера
2. Убедитесь, что все переменные окружения настроены
3. Проверьте, что профиль пользователя заполнен полностью
4. Убедитесь, что внешний API доступен

## Обновления

Для обновления API:

1. Обновите код
2. Перезапустите сервер
3. Проверьте работоспособность через тесты
4. Обновите документацию при необходимости
