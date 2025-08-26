# newbotksenia API

API на Express/TypeScript для n8n: защищённый заголовок и запись Telegram ID в MongoDB.

## Старт
- npm i
- создать .env по .env.example
- npm run dev

## Эндпоинты
- GET /health
- POST /n8n/users
  - Заголовок: x-n8n-token: <N8N_TOKEN>
  - Тело: { "telegramId": "123456789" }

## Переменные окружения
- PORT
- MONGO_URI
- N8N_TOKEN

## Docker
- Сборка образа: `docker build -t newbotksenia:latest .`
- Запуск: `docker run --env-file .env -p 3000:3000 newbotksenia:latest`

### Docker Compose
- Запуск локально (с Mongo): `docker compose up -d --build`
- По умолчанию `MONGO_URI` берётся из `.env`, при отсутствии — `mongodb://mongo:27017/newbotksenia`

## CI/CD (GitHub Actions)
- `.github/workflows/ci.yml` — сборка на ветке `master` и в PR
- `.github/workflows/docker-publish.yml` — сборка и публикация образа в GHCR при пуше в `master` и при теге `v*.*.*`
- Имя образа: `ghcr.io/<owner>/<repo>:<tag>`
