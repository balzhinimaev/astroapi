# Отладка ошибки 500 в API отчета о фазах луны

## Проблема
При вызове API `POST /n8n/moon-phase-report` с telegramId `1272270574` возвращается ошибка 500.

## Возможные причины

### 1. Не настроены переменные окружения
**Проверьте наличие в `.env` файле:**
```bash
ASTROLOGY_API_USER_ID=ваш_user_id
ASTROLOGY_API_KEY=ваш_api_key
```

### 2. Пользователь не найден в базе данных
Пользователь с telegramId `1272270574` может не существовать в базе данных.

### 3. Неполный профиль пользователя
У пользователя могут отсутствовать необходимые данные:
- `birthDate` - дата рождения
- `birthHour` - час рождения
- `birthMinute` - минута рождения
- `lastGeocode.lat` - широта
- `lastGeocode.lon` - долгота
- `lastGeocode.tzone` - часовой пояс

### 4. Проблемы с внешним API
Внешний API https://json.astrologyapi.com/v1/moon_phase_report может быть недоступен или возвращать ошибки.

### 5. Проблемы с подключением к MongoDB
База данных может быть недоступна.

## Шаги для отладки

### 1. Проверьте логи сервера
Запустите сервер и посмотрите на логи при вызове API:
```bash
npm run dev
```

### 2. Используйте отладочный скрипт
Запустите созданный скрипт для проверки:
```bash
node test-moon-phase-debug.js
```

### 3. Проверьте пользователя в базе данных
Выполните запрос к MongoDB:
```javascript
db.users.findOne({telegramId: "1272270574"})
```

### 4. Проверьте переменные окружения
Убедитесь, что все необходимые переменные настроены:
```bash
echo $ASTROLOGY_API_USER_ID
echo $ASTROLOGY_API_KEY
echo $MONGO_URI
```

### 5. Протестируйте внешний API
Проверьте доступность внешнего API:
```bash
curl -X POST https://json.astrologyapi.com/v1/moon_phase_report \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'user_id:api_key' | base64)" \
  -d '{"day": 1, "month": 1, "year": 2000, "hour": 12, "min": 0, "lat": 55.7558, "lon": 37.6176, "tzone": 3}'
```

## Исправления в коде

### 1. Улучшено логирование
Добавлено подробное логирование для отслеживания проблем:
- Логирование запросов к API
- Логирование ошибок внешнего API
- Логирование проблем с базой данных

### 2. Исправлены импорты
Заменены динамические импорты на статические для лучшей совместимости с продакшеном.

### 3. Улучшена обработка ошибок
Добавлена более детальная обработка различных типов ошибок с соответствующими HTTP статусами.

## Ожидаемые логи при успешном выполнении

```
[Moon Phase Report] Request for telegramId: 1272270574, language: russian
[Moon Phase API] Calling external API with payload: { day: 1, month: 1, year: 1990, hour: 12, min: 0, lat: 55.7558, lon: 37.6176, tzone: 3 }
[Moon Phase API] Success response: { moon_phase_report: [...] }
[Moon Phase Report] Success for telegramId: 1272270574
```

## Ожидаемые логи при ошибках

### Ошибка конфигурации API:
```
[Moon Phase Report] Error for telegramId 1272270574: Error: Astrology API credentials are not configured
```

### Пользователь не найден:
```
[Moon Phase Report] Error for telegramId 1272270574: Error: User not found
```

### Неполный профиль:
```
[Moon Phase Report] Error for telegramId 1272270574: Error: User profile is incomplete. Missing birth date, time, or location data.
```

### Ошибка внешнего API:
```
[Moon Phase API] External API error: 401 Unauthorized
[Moon Phase Report] Error for telegramId 1272270574: Error: Astrology API error: 401 Unauthorized
```

## Следующие шаги

1. Проверьте логи сервера при вызове API
2. Убедитесь, что все переменные окружения настроены
3. Проверьте наличие пользователя в базе данных
4. Убедитесь, что профиль пользователя заполнен полностью
5. Протестируйте внешний API отдельно
6. При необходимости обновите код и перезапустите сервер
