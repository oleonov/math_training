# Тренажёр таблицы умножения

Умный персональный тренажёр таблицы умножения для ребёнка. Не просто random-тест:
запоминает результат по каждой карточке и чаще показывает то, что знают хуже или давно
не повторяли. Прогресс хранится в БД и сохраняется между устройствами (после деплоя).

![Экраны: настройки, тренировка, итоги](docs/screens.png)

## Стек

- **Next.js 15 (App Router) + React + TypeScript** — фронтенд (SPA) и API в одном проекте.
- **Prisma ORM + SQLite** локально (легко переключается на PostgreSQL для деплоя).
- **Tailwind CSS v4** — адаптивный UI, шрифты Fredoka (числа) + Nunito (интерфейс).
- **bcryptjs** + подписанная HTTP-only cookie (HMAC) — авторизация.
- **Vitest** — unit-тесты чистой логики.

## Быстрый старт

Требуется Node.js 20+ и npm.

```bash
npm install
cp .env.example .env      # при необходимости поправь SESSION_SECRET
npm run setup             # prisma generate + создание БД + seed (карточки и пользователь)
npm run dev               # http://localhost:3000
```

Вход по умолчанию: **имя `kid`, пароль `12345`**.

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | Запуск в режиме разработки |
| `npm run build` | Прод-сборка (prisma generate + next build) |
| `npm run start` | Запуск собранного приложения |
| `npm test` | Прогон unit-тестов (Vitest) |
| `npm run setup` | Генерация клиента + `db push` + seed |
| `npm run db:push` | Синхронизация схемы с БД |
| `npm run db:seed` | Заполнение карточек и пользователей |

## Пользователи

Каждый пользователь имеет свой прогресс. Список задаётся в `prisma/seed.ts`:

```ts
const USERS = [{ name: "kid", password: "12345" }];
```

Добавь строки и выполни `npm run db:seed` (пароли хэшируются при сохранении).

## Как работает умный подбор

Каждая карточка получает priority score; чем выше — тем вероятнее показ:

```
priority = (1 - recentAverageScore) * 60   // как хорошо знает (EMA последних попыток)
         + overdueScore            * 25     // как давно не повторяли
         + newCardScore            * 30     // бонус новым карточкам (< 3 попыток)
         + random(0..10)                    // немного непредсказуемости
```

- `targetIntervalDays` (интервал повтора) зависит от уровня знания: 1 / 3 / 7 / 14 дней.
- Анти-повтор: карточки из последних нескольких вопросов не повторяются.
- `7×8` и `8×7` — одна карточка для статистики и анти-повтора, но показывается в обоих видах.
- Оценка: правильно до таймера = 100%, правильно после = 50%, неправильно = 0%.
  Первый пример сессии — без таймера. После истечения таймера вопрос не закрывается.

Вся эта логика — чистые функции в `src/lib/` (`scoring`, `stats`, `selection`, `cards`),
покрытые тестами и не зависящие от БД.

## Тесты

```bash
npm test
```

Покрыты: генерация/канонизация карточек, скоринг (100/50/0 + первый пример),
обновление статистики (EMA), формула приоритета, overdue, анти-повтор, weighted random,
подпись/проверка cookie.

## Деплой на свой сервер (math.pandorika-it.com → 46.101.75.18)

Боевой сервер — общий VPS на **Ubuntu 16.04**, где уже работают другие сайты под nginx.
Современный Node на эту ОС нативно не ставится, поэтому приложение запускается в
**Docker-контейнере (Node 20)**, а системный nginx сервера проксирует на него. БД — SQLite
в docker-volume (данные переживают пересборку). Деплой строго аддитивный: добавляется только
один новый nginx-vhost, чужие конфиги не трогаются.

В каталоге `deploy/`:

- `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh` — контейнер приложения (порт `127.0.0.1:3000`);
- `nginx-math-http.conf` / `nginx-math-ssl.conf` — vhost домена (до и после выпуска TLS);
- `push.sh` — заливка кода на сервер (rsync с локальной машины);
- `vps-deploy.sh` — сборка/запуск контейнера + nginx + Let's Encrypt (запускается на сервере).

Предусловия: DNS A-запись `math.pandorika-it.com → 46.101.75.18` (настроена), SSH-доступ root,
на сервере есть Docker + docker-compose + nginx + certbot (всё уже стоит).

### Деплой

```bash
# 1) с локальной машины — залить код
bash deploy/push.sh

# 2) на сервере — собрать контейнер, поднять, настроить nginx и HTTPS
ssh root@46.101.75.18 'bash /opt/mathcards/deploy/vps-deploy.sh'
```

После этого: **https://math.pandorika-it.com** (вход: `Amelia` / `12345`).

`vps-deploy.sh` идемпотентен и безопасен на общем сервере:

1. генерирует `deploy/.env` с `SESSION_SECRET` (один раз);
2. `docker-compose up -d --build` — контейнер на `127.0.0.1:3000` (наружу не торчит);
3. ждёт, пока приложение ответит локально;
4. ставит nginx-vhost (сначала HTTP для ACME), `nginx -t` → reload;
5. выпускает сертификат Let's Encrypt (webroot, только наш домен);
6. включает HTTPS-vhost с редиректом, `nginx -t` → reload.

### Обновления

```bash
bash deploy/push.sh
ssh root@46.101.75.18 'bash /opt/mathcards/deploy/vps-deploy.sh'
```

Пересобирает образ и перезапускает контейнер; данные в volume `mathcards-data` сохраняются.
Логи: `ssh root@46.101.75.18 'docker logs -f mathcards'`.

### Пользователи на проде

Контейнер при старте делает `prisma db seed` (идемпотентный upsert). Отредактируй `USERS` в
`prisma/seed.ts`, перезалей (`push.sh`) и передеплой — существующие пользователи и прогресс не
пострадают. Полный сброс прогресса — кнопкой «Сбросить память» (код `654654`).

> Файлы `server-setup.sh` / `mathcards.service` / `update.sh` / `nginx.conf` — вариант
> **нативной** установки (systemd, без Docker) для чистого современного VPS. На текущем
> сервере используется Docker-путь выше.

## Альтернатива: Vercel + Postgres

Если понадобится serverless вместо своего сервера: поменяй `provider` в
`prisma/schema.prisma` на `postgresql`, заведи Postgres (например [Neon](https://neon.tech)),
задай на Vercel `DATABASE_URL` и `SESSION_SECRET`, выполни `prisma db push && prisma db seed`
и задеплой на Vercel.

## Структура

```
prisma/schema.prisma        модель данных (User, Card, UserCardStats, Attempt, Session)
prisma/seed.ts              карточки (36 шт.) + пользователи
src/lib/                    чистая логика (cards, scoring, stats, selection, auth) + тесты
src/lib/training-service.ts оркестрация: чистая логика + Prisma
src/app/api/                роуты: login, logout, me, session/{start,answer,finish}
src/app/login/              страница входа
src/app/page.tsx            auth-gate главной
src/components/             SPA-экраны: Settings, Training, Summary, CircularTimer
docs/superpowers/specs/     дизайн-документ
```

## Заметки по безопасности

- В продакшене обязательно задай длинный случайный `SESSION_SECRET`.
- `npm audit` показывает critical в Vitest UI-сервере (`vitest --ui`) — он dev-only и
  здесь не используется (тесты гоняются headless через `vitest run`), в рантайм не попадает.
