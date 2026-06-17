---
name: git-create-repo
description: Create a new GitHub repository and clone it locally
allowed-tools:
  - Bash
  - exec_shell
---

# Git Create Repo

Создание нового GitHub-репозитория и клонирование его локально.

## Предварительные требования

Перед использованием убедись, что `gh` CLI установлен и аутентифицирован:

```bash
gh auth login
gh auth status
```

## Триггер

Когда пользователь просит создать новый GitHub-репозиторий, опубликовать проект на GitHub, или залить код в новый репозиторий.

## Порядок действий

### 1. Проверить `gh` и аутентификацию

```bash
gh auth status
```

Если not logged in — сообщить пользователю, что нужно выполнить `gh auth login`.

### 2. Инициализировать git (если ещё нет)

```bash
git init
```

### 3. Создать `.gitignore` (если нет)

Подобрать подходящий `.gitignore` под тип проекта (Node.js, Python, etc.) через `npx gitignore` или вручную.

### 4. Создать репозиторий на GitHub

```bash
gh repo create <repo-name> --public --source=. --remote=origin --push
```

- `--public` — публичный репозиторий (по умолчанию).
- `--private` — если пользователь явно просит приватный.
- `--source=.` — использовать текущую директорию.
- `--remote=origin` — добавить remote.
- `--push` — сразу запушить.

Если пользователь хочет описание:

```bash
gh repo create <repo-name> --public --source=. --remote=origin --push --description "Описание проекта"
```

### 5. Подтвердить результат

Вывести URL созданного репозитория и подтвердить, что код запушен.

## Примечания

- По умолчанию репозиторий публичный.
- Не хардкодить имя пользователя — `gh` сам определит владельца.
- Команды выполняются в рабочей директории проекта.
