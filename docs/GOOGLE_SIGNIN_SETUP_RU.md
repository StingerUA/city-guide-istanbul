# City Guide — Google sign-in через Supabase Auth

Интерфейс: `https://city-guide-istanbul.nncdecdgc.workers.dev/signin`

Кнопка «Продолжить с Google» работает через защищённый серверный OAuth/PKCE:
`/api/auth/google` → Supabase Auth → Google → `/api/auth/google/callback`.
Пароли Google не попадают в City Guide. Сервер создаёт HttpOnly cookie-сессию
и сохраняет переход на `/admin`, `/partner` или `/tourist`. Роли по-прежнему
определяются только подтверждённым email и базой, а не метаданными Google.

## 1. Настроить Google Cloud (делает владелец аккаунта)

1. Открой https://console.cloud.google.com/ и создай/выбери проект.
2. Google Auth Platform → **Branding**: укажи название **City Guide İstanbul**,
   email поддержки; настрой **Audience** как External.
   В режиме Testing добавь нужные Google-аккаунты в **Test users**;
   для открытого входа Google приложение нужно опубликовать для пользователей.
3. Google Auth Platform → **Clients** → **Create client** →
   **Web application**.
4. В поле **Authorized JavaScript origins** укажи
   `https://city-guide-istanbul.nncdecdgc.workers.dev`.
5. В поле **Authorized redirect URIs** укажи **именно Supabase callback**:
   `https://qfohfbuwnpjcbhmyosaf.supabase.co/auth/v1/callback`
   (НЕ `workers.dev` и не `/api/auth/google/callback`).
6. Сохрани Client ID и Client secret у себя. Секрет Google **не нужно**
   добавлять в GitHub или Cloudflare: он хранится в настройках Supabase.

## 2. Включить Google в Supabase

1. Открой https://supabase.com/dashboard/project/qfohfbuwnpjcbhmyosaf/auth/providers
2. **Authentication → Sign In / Providers → Google**.
3. Включи **Enable Sign in with Google**.
4. Вставь **Client ID** и **Client Secret** из Google Cloud, затем **Save**.
5. В Authentication → URL Configuration
   (`https://supabase.com/dashboard/project/qfohfbuwnpjcbhmyosaf/auth/url-configuration`)
   установи Site URL:
   `https://city-guide-istanbul.nncdecdgc.workers.dev`
6. В **Redirect URLs** добавь для PKCE авторизации:
   `https://city-guide-istanbul.nncdecdgc.workers.dev/api/auth/google/callback?flow=*`
   (это шаблон для случайного OAuth flow-токена; в реальном redirect URL
   после `?flow=` идёт уникальная случайная строка).

Различай **два адреса callback**: Google Cloud перенаправляет только в
**Supabase** (`supabase.co/auth/v1/callback`), а Supabase возвращает пользователя
в **City Guide Worker** (`workers.dev/api/auth/google/callback?flow=...`).

## 3. Проверка

1. Выйди из City Guide, открой `/signin`.
2. Нажми **«Продолжить с Google / Google ile devam et»**.
3. Выбери аккаунт в Google, разреши вход (если необходимо).
4. Должна открыться прежняя страница `/tourist`; если вход начинался
   из `/admin`, то возврат происходит в `/admin`.
5. Проверь создание/использование профиля `cg_users` и корректную роль.

## Безопасность

- PKCE SHA-256, случайный flow nonce, HttpOnly SameSite=Lax cookie с TTL 10 минут.
- OAuth код обменивается на сервере, в браузерных cookie записывается
  только серверная сессия; provider access tokens Google не сохраняются.
- Сервер проверяет подтверждение email через Supabase.
- Администраторы: только `nncdecdgc@gmail.com`, `sayitatas@hotmail.com`,
  независимо от того, вошли они через пароль или Google.
- Если Google провайдер ещё не включён в Supabase, кнопка может открываться,
  но вход завершится ошибкой — сначала выполни шаги 1–2.

Ссылки:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
