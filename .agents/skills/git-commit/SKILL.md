---
name: git-commit
description: 'Execute git commit with conventional commit message analysis, intelligent staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit". Supports: (1) Auto-detecting type and scope from changes, (2) Generating conventional commit messages from diff, (3) Intelligent file staging for logical grouping'
license: MIT
allowed-tools:
  - Bash
  - exec_shell
  - git_status
  - git_diff
---

# Git Commit with Conventional Commits

## Overview

Create standardized, semantic git commits using the Conventional Commits specification. Analyze the actual diff to determine appropriate type, scope, and message.

## Conventional Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types

| Type       | Purpose                        |
| ---------- | ------------------------------ |
| `feat`     | New feature                    |
| `fix`      | Bug fix                        |
| `docs`     | Documentation only             |
| `style`    | Formatting/style (no logic)    |
| `refactor` | Code refactor (no feature/fix) |
| `perf`     | Performance improvement        |
| `test`     | Add/update tests               |
| `build`    | Build system/dependencies      |
| `ci`       | CI/config changes              |
| `chore`    | Maintenance/misc               |
| `revert`   | Revert commit                  |

## Breaking Changes

```
feat!: remove deprecated endpoint

feat: allow config to extend other configs

BREAKING CHANGE: `extends` key behavior changed
```

## Workflow

### 1. Analyze Changes

Использовать `git_status` и `git_diff` для анализа изменений.

### 2. Stage Files (if needed)

```bash
git add path/to/file1 path/to/file2
git add src/components/*
```

**Never commit secrets** (.env, credentials.json, private keys).

### 3. Generate Commit Message

Проанализировать diff и определить:
- **Type**: тип изменения
- **Scope**: затронутый модуль/область
- **Description**: краткое описание (present tense, imperative mood, <72 символов)

### 4. Execute Commit

```bash
git commit -m "<type>[scope]: <description>"
```

## Best Practices

- Одно логическое изменение — один коммит
- Present tense: "add" не "added"
- Imperative mood: "fix bug" не "fixes bug"
- Ссылки на issues: `Closes #123`, `Refs #456`

## Git Safety Protocol

- NEVER update git config
- NEVER run destructive commands (--force, hard reset) without explicit request
- NEVER skip hooks (--no-verify) unless user asks
- NEVER force push to main/master
