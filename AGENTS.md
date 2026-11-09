# AGENTS.md

Сервис записи на звонок, упрощённый Cal.com. Сценарий и правила бронирования описаны в README.md.

## Команды

- `mise trust && mise install && mise run setup`: инструменты, зависимости и git-хуки.
- `mise daemons start` / `stop` / `logs`: бэкенд на :3000 и фронтенд на :5173, фронтенд проксирует `/api` на бэкенд.
- `mise run generate`: после правки `spec/main.tsp` пересобирает OpenAPI, типы маршрутов бэкенда и SDK фронтенда.
- `mise run lint`, `mise run test`: линтеры и тесты по отдельности.
- `pnpm --dir backend exec vitest run test/health.test.ts -t "<имя теста>"`: один тест, во фронтенде так же через `--dir frontend`.
- `hk check --all -S <step>`: один шаг проверок (`oxlint`, `oxfmt`, `jactionlint`, `generated`, `typecheck`, `test`, `build`, `image`).
- `mise run check`: все проверки, тот же набор запускает CI и pre-push. Нужен запущенный Docker: шаг `image` собирает образ и проверяет контейнер. Изменение готово, когда команда зелёная.
- `mise run fix`: автоисправления линтеров и форматтера.

## Устройство

API идёт от контракта: `spec/main.tsp` → `mise run generate` → `spec/generated/openapi.yaml` → типы и SDK в `backend/src/generated` и `frontend/src/generated`.

- `backend/`: Fastify. fastify-openapi-glue при старте читает `spec/generated/openapi.yaml` и сам строит маршруты и валидацию запросов. Обработчики лежат в `src/handlers.ts` под ключами `operationId` и типизированы сгенерированным `RouteHandlers`, поэтому новая операция в контракте без обработчика валит typecheck. Node запускает TypeScript напрямую, без сборки: относительные импорты пишем с расширением `.ts`, синтаксис только стираемый (без `enum` и `namespace`).
- `frontend/`: React, Vite и Mantine, маршруты на React Router в декларативном режиме. К API обращается только через функции SDK из `src/generated`. Тесты рендерят `App` в `MemoryRouter` по нужному адресу и проверяют страницу через Testing Library.
- `Dockerfile`: один образ на приложение. Точка входа `backend/src/server.ts` отдаёт API и сборку фронтенда, на прочие GET вне `/api/` отвечает `index.html`. Итоговая стадия повторяет раскладку репозитория: сервер находит контракт и сборку относительно своих модулей, поэтому новый файл, который сервер читает при работе, надо скопировать в образ.

## Правила

- Папки `generated/` меняются только через `mise run generate`.
- `.github/workflows/hexlet-check.yml` принадлежит Хекслету, его не меняем.
- Правила линтеров остаются включёнными. Исключение делаем точечно, для одного пути и одного правила, с причиной и после решения человека.
- TypeScript держим на 6.x: hey-api использует JS-API компилятора, которого нет в TypeScript 7.
- Коммиты пишем по [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`, например `docs: add booking scenario to README`. Описание на английском, в повелительном наклонении. Коммит реализации ссылается на тикет, который закрывает: `feat: add meeting type catalog (#18)`.
- Тикеты спецификации реализуем в одной общей ветке и вливаем её в `main` после общего ревью. Правки вне тикетов коммитим прямо в `main`.

## Agent skills

### Issue tracker

Карта решений, спецификации и тикеты живут в GitHub Issues репозитория `ArtemKrivtsov/ai-for-developers-project-386`, работаем через `gh`. См. `docs/agents/issue-tracker.md`.

### Triage labels

Стандартные метки, названия совпадают с ролями. См. `docs/agents/triage-labels.md`.

### Domain docs

Один контекст: словарь в `GLOSSARY.md`, решения в `docs/adr/` в корне репозитория. См. `docs/agents/domain.md`.
