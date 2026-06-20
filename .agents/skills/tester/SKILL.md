---
name: tester
description: Systematic functional testing of auth, API endpoints, and UI flows. Use when the user asks to test, QA, verify, or validate functionality — especially authentication, registration, CRUD, and data validation.
---

# QA Tester

Systematic testing skill for the AR_Overlay project. Tests server API endpoints
(`server.js` on port 3001) and client behaviour. Uses `exec_shell` with `curl`
(PowerShell `Invoke-RestMethod`) for API testing and code analysis for static
validation.

## Scope

- Auth endpoints: `POST /api/register`, `POST /api/login`, `GET /api/me`,
  `POST /api/change-password`
- Client-side validation in `Login.jsx` and `AuthContext.jsx`
- Session management, token lifecycle, localStorage persistence
- Edge cases: empty fields, invalid emails, short passwords, duplicate emails,
  wrong credentials, stale tokens, password change + session invalidation

## Workflow

### Phase 1 — Static Analysis
1. Read server auth handlers (`server.js` lines 90-192).
2. Read client auth (`src/state/AuthContext.jsx`, `src/pages/Login.jsx`).
3. Read routing logic (`src/App.jsx`).
4. Identify validation points on both sides.
5. Note any discrepancies between client and server validation.

### Phase 2 — API Testing (Server must be running)
1. Ensure server is running on port 3001 (`pnpm dev` or `node server.js`).
2. Use PowerShell `Invoke-RestMethod` (alias of `curl`):
   ```powershell
   $body = @{ email='test@example.com'; password='123456' } | ConvertTo-Json
   irm -Uri http://localhost:3001/api/register -Method POST -Body $body -ContentType 'application/json'
   ```
3. Run test cases for each endpoint:
   - Happy path: valid register → token returned, valid login → token returned
   - Validation errors: missing fields, invalid email, short password,
     duplicate email, wrong password
   - Auth errors: no token, bad token for `/api/me` and `/api/change-password`
   - Session lifecycle: login → /api/me → change password → old token invalid

### Phase 3 — Report
Summarise findings in a structured report:
- **Test cases passed / failed / blocked**
- **Bug list** with severity (critical / high / medium / low)
- **Recommendations** for fixes

## Test Cases Reference

| # | Endpoint | Scenario | Expected Status | Expected Body |
|---|----------|----------|-----------------|---------------|
| 1 | POST /api/register | Valid email + 6-char password | 201 | `{ token, user: { email } }` |
| 2 | POST /api/register | Missing email | 400 | `{ error: "..." }` |
| 3 | POST /api/register | Missing password | 400 | `{ error: "..." }` |
| 4 | POST /api/register | Invalid email format | 400 | `{ error: "Некорректный email" }` |
| 5 | POST /api/register | Password < 6 chars | 400 | `{ error: "..." }` |
| 6 | POST /api/register | Duplicate email | 409 | `{ error: "Пользователь с таким email уже существует" }` |
| 7 | POST /api/login | Valid credentials | 200 | `{ token, user: { email } }` |
| 8 | POST /api/login | Wrong password | 401 | `{ error: "Неверный email или пароль" }` |
| 9 | POST /api/login | Unknown email | 401 | `{ error: "Неверный email или пароль" }` |
| 10 | POST /api/login | Missing fields | 400 | `{ error: "Email и пароль обязательны" }` |
| 11 | GET /api/me | Valid token | 200 | `{ user: { email } }` |
| 12 | GET /api/me | No token | 401 | `{ error: "Не авторизован" }` |
| 13 | GET /api/me | Invalid token | 401 | `{ error: "Не авторизован" }` |
| 14 | POST /api/change-password | Valid old + new ≥6 chars | 200 | `{ ok: true }` |
| 15 | POST /api/change-password | Wrong old password | 403 | `{ error: "Неверный текущий пароль" }` |
| 16 | POST /api/change-password | New password < 6 chars | 400 | `{ error: "..." }` |
| 17 | POST /api/change-password | No token | 401 | `{ error: "Не авторизован" }` |
