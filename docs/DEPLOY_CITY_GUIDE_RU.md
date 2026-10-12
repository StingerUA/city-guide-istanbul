# City Guide — Cloudflare Workers + Supabase, инструкция для запуска

Статус: код адаптирован для самостоятельного Cloudflare Worker, Supabase PostgreSQL и закрытого Storage.
GitHub Pages **не** запускает Next.js/Vinext и показывает README — это ожидаемо.
Рабочий URL появится только после первой публикации Worker.

## Что уже подготовлено
- Supabase: проект `qfohfbuwnpjcbhmyosaf`; 8 таблиц, RLS, приватный bucket `city-guide-photos`.
- PostgreSQL: транзакционная функция `cg_book_atomic` с блокировкой инвентаря и защитой от двойного бронирования. Функция доступна только `service_role`.
- GitHub: source, Vite/Cloudflare config, отдельные адреса `/tourist`, `/partner`, `/admin`, Auth.
- Серверная логика обращается к Supabase; D1 и R2 для текущего приложения больше не нужны.
- Workflow `Verify City Guide` проверяет TypeScript и production build; `Deploy City Guide Worker` публикует по ручному запуску.

## Что нужно сделать владельцу Cloudflare (доступа к его аккаунту у ChatGPT сейчас нет)

### 1. Дать GitHub Actions доступ к публикации Cloudflare
Cloudflare Dashboard → My Profile → API Tokens → Create Token → шаблон **Edit Cloudflare Workers**.
Сохранить токен самостоятельно, не отправлять его в переписку.
Cloudflare Account ID найти на странице аккаунта.

GitHub репозиторий → Settings → Secrets and variables → Actions → New repository secret:
- `CLOUDFLARE_API_TOKEN` (секрет)
- `CLOUDFLARE_ACCOUNT_ID` (ID аккаунта)

### 2. Первый деплой
GitHub → Actions → **Deploy City Guide Worker** → **Run workflow** → выбрать `main`.
Если изменения ещё в отдельной ветке, сперва дождаться успешного CI и объединить PR в `main`.
Первый deploy создаст Worker `city-guide-istanbul` в аккаунте.
После этого Cloudflare покажет адрес вида `https://city-guide-istanbul.<your-subdomain>.workers.dev`.

### 3. Supabase ключи Worker
Cloudflare Dashboard → Workers & Pages → `city-guide-istanbul` → Settings → Variables and Secrets.
Добавить Worker runtime variables:
- `SUPABASE_URL` = `https://qfohfbuwnpjcbhmyosaf.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = твой публичный ключ из Supabase → Project Settings → API Keys.
- `SUPABASE_SECRET_KEY` = **Secret**, новый ключ `sb_secret_...` из Supabase → Project Settings → API Keys.

Важно: `SUPABASE_SECRET_KEY` — серверный администраторский ключ с обходом RLS.
Нельзя записывать его в репозиторий, клиентский JS, `NEXT_PUBLIC_*`, либо отправлять в чат.
Секрет хранить **только** как зашифрованный Cloudflare Worker Secret.

### 4. Email и регистрация
Supabase → Authentication → URL Configuration: Site URL = твой рабочий `workers.dev` адрес.
Для реальных писем о подтверждении регистрации рекомендуется SMTP-провайдер.
Первый пользователь с подтверждённым email получает роль tourist.
Права администратора есть только у двух фиксированных проверенных адресов:
`nncdecdgc@gmail.com` и `sayitatas@hotmail.com`.
Партнёрская роль назначается администратором в приложении.

### 5. Проверить приложение
- `https://<worker>/signin` — регистрация и вход;
- `https://<worker>/tourist` — клиентский интерфейс после входа;
- `https://<worker>/admin` — кабинет администратора;
- `https://<worker>/partner` — кабинет партнёра.
- `https://<worker>/api/supabase/status` — диагностический статус подключения без вывода ключей.

Рекомендация: протестировать две одновременные заявки на последнее свободное место, роли,
создание заведений, загрузку фото и изменение статусов на test accounts до реального запуска.

## Важные ограничения
Текущая сборка может быть проверена GitHub Actions без секретов, но полноценная работа API
требует реальных Worker runtime переменных. Нельзя считать приложение публично
запущенным, пока не выполнены пункты 1–5. GitHub Pages НЕ перенаправляет на Worker
до появления его точного URL. Старые тесты, рассчитанные на D1/Sites,
не доказывают работоспособность Supabase backend; для production нужен e2e тест сессий и бронирований.
