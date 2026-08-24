# Central Office Backend

REST API админ-панели центрального офиса по тестовому заданию.

## Стек

- **NestJS 11**, TypeScript;
- **Prisma ORM 6**, PostgreSQL;
- JWT access/refresh, Passport, bcrypt;
- Docker и Docker Compose;
- Swagger/OpenAPI, class-validator, Helmet, rate limiting;
- Jest, ESLint, Prettier.

Единственная активная сессия контролируется через PostgreSQL.

## Реализовано

- автоматическое создание единственного `root` при первой инициализации;
- DB-level ограничение, не позволяющее создать второго root;
- root-only создание, смена пароля и удаление менеджеров;
- CRUD владельцев магазинов;
- создание и просмотр магазинов, смена credentials;
- терминалы, ручная смена статуса и heartbeat;
- заявки, комментарии, атомарное одобрение с созданием терминала, отклонение;
- access/refresh JWT, logout и ротация refresh-токена;
- правило «один аккаунт — одна активная сессия»;
- завершение сессии после смены пароля/credentials;
- списки всех сущностей;
- Swagger и healthcheck.

## Быстрый запуск через Docker

Требуются Docker Desktop и Docker Compose v2.

```bash
docker compose up -d --build
```

Compose запускает:

| Сервис | Назначение | Порт |
|---|---|---:|
| `backend` | NestJS API | 3000 |
| `postgres` | PostgreSQL | 5432 |
| `migrate` | одноразовое применение Prisma migrations | — |

Проверка:

```bash
docker compose ps -a
curl http://localhost:3000/health
```

Нормальные состояния:

- `backend` — `Up`;
- `postgres` — `Up (healthy)`;
- `migrate` — `Exited (0)`.

Адреса:

- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs>
- Healthcheck: <http://localhost:3000/health>

Локальный root:

```text
email: root@example.com
password: ChangeMe123!
```

Если порт PostgreSQL 5432 уже занят, создайте `.env`:

```dotenv
POSTGRES_PORT=5433
```

Затем перезапустите:

```bash
docker compose down
docker compose up -d
```

Перед публикацией проекта задайте собственные секреты:

```dotenv
ROOT_NAME=System Root
ROOT_EMAIL=root@example.com
ROOT_PASSWORD=a-strong-root-password
JWT_ACCESS_SECRET=a-random-secret-with-at-least-32-characters
JWT_REFRESH_SECRET=another-random-secret-with-at-least-32-characters
POSTGRES_PASSWORD=a-strong-db-password
POSTGRES_PORT=5433
```

Остановка без удаления данных:

```bash
docker compose down
```

Полный сброс вместе с данными:

```bash
docker compose down -v
docker compose up -d --build
```

## Локальный запуск без Docker

Нужны Node.js 20+ и PostgreSQL.

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

## Одна активная сессия

Для каждого администратора или магазина в таблице `sessions` может быть только одна запись.

1. При login версия сессии увеличивается.
2. Access и refresh JWT содержат `sessionId` и версию.
3. Каждый защищённый запрос сверяет токен с записью PostgreSQL.
4. Повторный login меняет версию — предыдущие токены перестают работать.
5. Refresh-токен ротируется и хранится в БД только как SHA-256 hash.
6. Logout и смена пароля отзывают сессию.

Таким образом PostgreSQL обеспечивает требование «один аккаунт — одна активная сессия».

## Авторизация

### Администратор

```http
POST /auth/login
Content-Type: application/json

{
  "email": "root@example.com",
  "password": "ChangeMe123!"
}
```

### Магазин

```http
POST /auth/shop/login
Content-Type: application/json

{
  "login": "shop-001",
  "password": "StrongShopPassword1!"
}
```

Ответ:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 900,
  "user": {
    "id": "uuid",
    "actorType": "ADMIN",
    "name": "System Root",
    "identifier": "root@example.com",
    "role": "ROOT"
  }
}
```

Заголовок защищённых запросов:

```http
Authorization: Bearer <accessToken>
```

Refresh:

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

Logout:

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

Ответ: `204 No Content`.

## API

GET-ручки списков возвращают JSON-массивы сущностей.

### Система

| Метод | URL | Доступ | Назначение |
|---|---|---|---|
| GET | `/health` | public | Проверка API и PostgreSQL |
| GET | `/docs` | public | Swagger UI |

### Авторизация

| Метод | URL | Доступ | Тело |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password }` |
| POST | `/auth/shop/login` | public | `{ login, password }` |
| POST | `/auth/refresh` | public | `{ refreshToken }` |
| POST | `/auth/logout` | JWT | — |

### Администраторы

| Метод | URL | Доступ | Назначение |
|---|---|---|---|
| GET | `/admins` | admin | Список администраторов |
| POST | `/admins` | root | Создать manager |
| PATCH | `/admins/:id/password` | root | Сменить пароль manager и отозвать сессию |
| DELETE | `/admins/:id` | root | Удалить manager |

Root нельзя создать или удалить через API.

### Владельцы магазинов

| Метод | URL | Доступ |
|---|---|---|
| GET | `/shops-owners` | admin |
| GET | `/shops-owners/:id` | admin |
| POST | `/shops-owners` | admin |
| PATCH | `/shops-owners/:id` | admin |
| DELETE | `/shops-owners/:id` | admin |

Пример создания:

```json
{
  "name": "Иван Иванов",
  "email": "owner@example.com",
  "phone": "+7 999 123-45-67",
  "companyName": "ООО Ромашка",
  "taxId": "7701234567"
}
```

### Магазины

| Метод | URL | Доступ |
|---|---|---|
| GET | `/shops` | admin |
| GET | `/shops/:id` | admin |
| POST | `/shops` | admin |
| PATCH | `/shops/:id/credentials` | admin |

Пример создания:

```json
{
  "ownerId": "uuid владельца",
  "name": "Магазин №1",
  "address": "Москва, ул. Примерная, 1",
  "login": "shop-001",
  "password": "StrongShopPassword1!"
}
```

### Терминалы

| Метод | URL | Доступ |
|---|---|---|
| GET | `/terminals` | admin |
| GET | `/terminals/:id` | admin |
| PATCH | `/terminals/:id/status` | admin |
| POST | `/terminals/alive` | shop JWT |

Heartbeat:

```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF"
}
```

### Заявки

| Метод | URL | Доступ |
|---|---|---|
| GET | `/requests` | admin |
| POST | `/requests` | shop/admin JWT |
| PATCH | `/requests/:id/approve` | admin |
| PATCH | `/requests/:id/reject` | admin |
| POST | `/requests/:id/comment` | admin |

`POST /requests` добавлен для полного тестового сценария, поскольку без него заявку невозможно создать через API.

Пример:

```json
{
  "shopId": "uuid магазина",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "comment": "Новый терминал"
}
```

### Профиль

```http
PATCH /profile/password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "CurrentPassword1!",
  "newPassword": "NewPassword1!"
}
```

После смены пароля сессия завершается.

## Модель данных

- `Admin` (`ROOT` / `MANAGER`);
- `ShopOwner`;
- `Shop`;
- `Terminal` ("ACTIVE" / "INACTIVE");
- `ConnectionRequest` ("PENDING" / "APPROVED" / "REJECTED);
- `RequestComment`;
- `Session`.

Пароли хранятся как bcrypt hash и никогда не возвращаются API.

## Проверка качества

```bash
npm run lint
npm run build
npm test -- --runInBand
```
