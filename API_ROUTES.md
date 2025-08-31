# API Роуты для управления активными раскладами

## Обзор

Добавлены новые роуты для управления состоянием пользователя в процессе работы с различными астрологическими раскладами. Это позволяет n8n запоминать, с каким раскладом работает пользователь, и сохранять промежуточные данные.

## Новые поля в модели User

```typescript
activeSpread: {
  type: String,
  enum: [
    'yes_no_tarot',
    'daily_horoscope',
    'compatibility',
    'natal_chart',
    'transit',
    'synastry',
    'progressed',
    'solar_return',
    'lunar_return',
    'custom',
    'none'        // специальное значение: нет активного расклада
  ],
  default: 'none'
},
activeSpreadData: Schema.Types.Mixed,  // Произвольные данные расклада
activeSpreadStartedAt: Date            // Время начала работы с раскладом
```

## API Роуты

### 1. Установка активного расклада

**POST** `/n8n/users/active-spread`

Устанавливает активный расклад для пользователя.

**Тело запроса:**
```json
{
  "telegramId": "123456789",
  "spreadType": "yes_no_tarot",
  "spreadData": {
    "question": "Стоит ли мне переезжать?",
    "cards": ["Колесница", "Звезда"]
  }
}
```

**Ответ:**
```json
{
  "ok": true,
  "user": {
    "telegramId": "123456789",
    "activeSpread": "yes_no_tarot",
    "activeSpreadData": {
      "question": "Стоит ли мне переезжать?",
      "cards": ["Колесница", "Звезда"]
    },
    "activeSpreadStartedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Получение активного расклада

**GET** `/n8n/users/:telegramId/active-spread`

Получает информацию об активном раскладе пользователя. Если активного расклада нет, `activeSpread` будет равен строке `"none"`.

**Ответ (когда активный есть):**
```json
{
  "ok": true,
  "exists": true,
  "activeSpread": "yes_no_tarot",
  "activeSpreadData": {
    "question": "Стоит ли мне переезжать?",
    "cards": ["Колесница", "Звезда"]
  },
  "activeSpreadStartedAt": "2024-01-15T10:30:00.000Z"
}
```

**Ответ (когда активного нет):**
```json
{
  "ok": true,
  "exists": true,
  "activeSpread": "none",
  "activeSpreadData": null,
  "activeSpreadStartedAt": null
}
```

### 3. Завершение активного расклада

**POST** `/n8n/users/active-spread/complete`

Завершает активный расклад, сохраняя результат и очищая активное состояние.

**Тело запроса:**
```json
{
  "telegramId": "123456789",
  "resultData": {
    "interpretation": "Да, переезд будет благоприятным",
    "confidence": 0.85
  }
}
```

**Ответ:**
```json
{
  "ok": true,
  "user": {
    "telegramId": "123456789",
    "activeSpread": "none",
    "activeSpreadData": {
      "question": "Стоит ли мне переезжать?",
      "cards": ["Колесница", "Звезда"],
      "result": {
        "interpretation": "Да, переезд будет благоприятным",
        "confidence": 0.85
      },
      "completedAt": "2024-01-15T10:35:00.000Z"
    },
    "activeSpreadStartedAt": null
  }
}
```

### 4. Очистка активного расклада

**POST** `/n8n/users/active-spread/clear`

Очищает активный расклад без сохранения результата.

**Тело запроса:**
```json
{
  "telegramId": "123456789"
}
```

**Ответ:**
```json
{
  "ok": true,
  "user": {
    "telegramId": "123456789",
    "activeSpread": "none",
    "activeSpreadData": null,
    "activeSpreadStartedAt": null
  }
}
```

### 5. Обновление данных активного расклада

**POST** `/n8n/users/active-spread/update-data`

Обновляет данные активного расклада (например, добавляет новые карты или ответы пользователя).

**Тело запроса:**
```json
{
  "telegramId": "123456789",
  "spreadData": {
    "question": "Стоит ли мне переезжать?",
    "cards": ["Колесница", "Звезда", "Солнце"],
    "userResponse": "Да, я хочу переехать"
  }
}
```

**Ответ:**
```json
{
  "ok": true,
  "user": {
    "telegramId": "123456789",
    "activeSpread": "yes_no_tarot",
    "activeSpreadData": {
      "question": "Стоит ли мне переезжать?",
      "cards": ["Колесница", "Звезда", "Солнце"],
      "userResponse": "Да, я хочу переехать"
    },
    "activeSpreadStartedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Примеры использования в n8n

### Сценарий 1: Начало работы с раскладом
1. Пользователь выбирает "Да/Нет Таро"
2. Вызывается `POST /n8n/users/active-spread` с `spreadType: "yes_no_tarot"`
3. Бот запоминает, что пользователь работает с этим раскладом

### Сценарий 2: Сбор дополнительной информации
1. Бот задает вопрос: "Какой у вас вопрос?"
2. Пользователь отвечает
3. Вызывается `POST /n8n/users/active-spread/update-data` для сохранения вопроса
4. Бот продолжает работу с обновленными данными

### Сценарий 3: Завершение расклада
1. Расклад завершен, получен результат
2. Вызывается `POST /n8n/users/active-spread/complete` с результатом
3. Активный расклад очищается, результат сохраняется

## Обработка ошибок

Все роуты возвращают стандартные HTTP статус коды:
- `200` - успешное выполнение
- `400` - некорректные данные запроса
- `404` - пользователь не найден
- `500` - внутренняя ошибка сервера

## Безопасность

Все роуты защищены middleware `requireN8nToken`, который проверяет валидность токена n8n.

## Новый маршрут: Отчет о фазах луны

### Получение отчета о фазах луны

**POST** `/n8n/moon-phase-report`

Получает астрологический отчет о фазах луны для пользователя на основе его данных рождения и местоположения.

**Тело запроса:**
```json
{
  "telegramId": "123456789",
  "language": "russian"
}
```

**Параметры:**
- `telegramId` (обязательный) - ID пользователя в Telegram
- `language` (опциональный) - язык отчета (по умолчанию "russian")

**Ответ:**
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
- `400` - Профиль пользователя неполный (отсутствуют дата рождения, время или данные о местоположении)
- `404` - Пользователь не найден
- `500` - Внутренняя ошибка сервера

**Требования к профилю пользователя:**
Для получения отчета у пользователя должны быть заполнены:
- `birthDate` - дата рождения в формате YYYY-MM-DD
- `birthHour` - час рождения (0-23)
- `birthMinute` - минута рождения (0-59)
- `lastGeocode.lat` - широта местоположения
- `lastGeocode.lon` - долгота местоположения
- `lastGeocode.tzone` - часовой пояс (смещение от UTC в часах)

**Пример использования:**
```bash
curl -X POST http://localhost:3000/n8n/moon-phase-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_N8N_TOKEN" \
  -d '{
    "telegramId": "123456789",
    "language": "russian"
  }'
```

**Примечание:** Этот маршрут использует внешний API https://json.astrologyapi.com/v1/moon_phase_report для получения астрологических данных. Убедитесь, что в переменных окружения настроены `ASTROLOGY_API_USER_ID` и `ASTROLOGY_API_KEY`.

## Новый маршрут: Отчет о личности

### Получение отчета о личности

**POST** `/n8n/astro/personality`

Получает астрологический отчет о личности пользователя на основе его данных рождения и местоположения.

**Тело запроса:**
```json
{
  "telegramId": "123456789",
  "language": "russian",
  "house_type": "placidus"
}
```

**Параметры:**
- `telegramId` (обязательный) - ID пользователя в Telegram
- `language` (опциональный) - язык отчета (по умолчанию "russian")
- `house_type` (опциональный) - тип системы домов (по умолчанию "placidus")

**Ответ:**
```json
{
  "ok": true,
  "payload": {
    "day": 15,
    "month": 3,
    "year": 1990,
    "hour": 14,
    "min": 30,
    "lat": 55.7558,
    "lon": 37.6176,
    "tzone": 3,
    "house_type": "placidus"
  },
  "result": {
    "report": [
      "Вы можете иметь трудности в общении в раннем возрасте...",
      "У вас будут сильные симпатии и антипатии...",
      "Положение Луны в вашем гороскопе значительно увеличит эмоциональную природу..."
    ],
    "spiritual_lesson": "Духовный урок для изучения: Общительность (расслабьтесь)",
    "key_quality": "Мы думаем"
  }
}
```

**Ошибки:**
- `400` - Профиль пользователя неполный (отсутствуют дата рождения, время или данные о местоположении)
- `404` - Пользователь не найден
- `500` - Внутренняя ошибка сервера

**Требования к профилю пользователя:**
Для получения отчета у пользователя должны быть заполнены:
- `birthDate` - дата рождения в формате YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY и др.
- `birthHour` - час рождения (0-23)
- `birthMinute` - минута рождения (0-59)
- `lastGeocode.lat` - широта местоположения
- `lastGeocode.lon` - долгота местоположения
- `lastGeocode.tzone` - часовой пояс (смещение от UTC в часах)

**Пример использования:**
```bash
curl -X POST http://localhost:3000/n8n/astro/personality \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_N8N_TOKEN" \
  -d '{
    "telegramId": "123456789",
    "language": "russian",
    "house_type": "placidus"
  }'
```

**Примечание:** Этот маршрут использует внешний API https://json.astrologyapi.com/v1/personality_report/tropical для получения астрологических данных. Убедитесь, что в переменных окружения настроены `ASTROLOGY_API_USER_ID` и `ASTROLOGY_API_KEY`.
