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
