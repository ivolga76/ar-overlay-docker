# Бэкап AR_Overlay — 2026-06-20 10:02

## Состав
| Файл | Размер | Описание |
|------|--------|----------|
| `AR_Overlay_git_bundle_20260620.bundle` | 3,37 MB | Полная история Git (все ветки, все коммиты) |
| `AR_Overlay_source_20260620.zip` | 2,44 MB | Исходный код (47 файлов, без node_modules/dist/.git) |

## Последний коммит
`576aa1d` — `perf(overlay): memoize widgets and data to prevent re-renders on timer ticks`

## Восстановление
```bash
# Из бандла:
git clone AR_Overlay_git_bundle_20260620.bundle restored/
# Из zip:
Expand-Archive AR_Overlay_source_20260620.zip restored/
# Затем:
pnpm install
pnpm dev
```

## Бандл содержит
- `refs/heads/master`
- `refs/remotes/origin/master`
- `HEAD`
- Полная история (sha1)
