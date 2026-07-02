# 🎨 UEZ Talk — брендирование Nextcloud Talk Desktop для АО «СЗ «УЭЗ»

White-label комплект для [nextcloud/talk-desktop](https://github.com/nextcloud/talk-desktop) под Windows 11 Pro. Использует **штатный механизм брендирования** через `.overrides/build.config.json` — без патчей исходного кода, форк остаётся легко обновляемым.

## 📦 Состав комплекта

| Путь | Назначение |
|---|---|
| `brand-talk-desktop.sh` | Скрипт применения / отката (`--restore`) |
| `.overrides/build.config.json` | Имя «UEZ Talk», домен `o.uez.ru` (enforced), цвет `#016BB2` |
| `img/*.svg` | 12 фирменных SVG: иконка приложения, трей (светлая/тёмная), белый логотип для экрана входа |
| `img/icons/*` | Готовые `icon.ico` (16–256 px), трей-`.ico`, `icon.png`, `icon.icns` — сгенерированы штатным `generate-icons.js` |

## ⚙️ Что даёт конфиг

- **applicationName: "UEZ Talk"** — имя exe, ярлыков, заголовка окна, записи в «Установка и удаление программ». Латиница выбрана намеренно: `applicationNameSanitized` вырезает всё, кроме `[a-z0-9]`, и кириллица сломала бы AppUserModelId для Squirrel.
- **domain + enforceDomain** — адрес сервера `https://o.uez.ru` зашит, пользователь не сможет подключиться к чужому серверу.
- **brandColor / brandGradient** — фирменный синий на экране входа и сплэше.
- **winAppId** выводится из домена → `ru.uez.o.talk`, WiX UpgradeCode генерируется детерминированно — обновления MSI поверх старых версий будут работать корректно.
- `primaryColor` / `backgroundColor` **намеренно не переопределены**: иначе сборка потребует оверрайдов серверных стилей (`override-nextcloud-styles.mjs` + локальный Nextcloud). Тема внутри приложения всё равно приедет с сервера `o.uez.ru` (Theming app).

## 🚀 Применение и сборка

```bash
# 1. Применить брендирование
chmod +x brand-talk-desktop.sh
./brand-talk-desktop.sh /path/to/talk-desktop

# 2. Подготовить сборку
cd /path/to/talk-desktop
npm ci
git clone https://github.com/nextcloud/spreed --branch stable34
npm ci --prefix=spreed        # либо TALK_PATH=... в .env

# 3. Собрать под Windows 11 x64
npm run package:windows:x64
```

Артефакты в `out/make/`:
- `UEZ.Talk-windows-x64.exe` — Squirrel, установка в один клик под пользователем;
- `UEZ.Talk-windows-x64.msi` — WiX, машинная установка — **рекомендуется для развёртывания через GPO/SCCM**.

> 💡 Нативную сборку Windows-таргета удобно выполнять в GitHub Actions на `windows-latest` (как в форке `TomasPopovas/talk-desktop`) либо на Windows-машине с Node 20+. Кросс-сборка exe/msi из Linux требует wine и не рекомендуется.

## 🖼 Дизайн иконок

- **Иконка приложения** — белый знак УЭЗ на скруглённом квадрате `#016BB2` (стиль Fluent/Win11), размеры 16–256 px в одном `.ico`.
- **Трей** — три варианта: цветная, белая (тёмная панель задач — по умолчанию в Win11), тёмная (светлая панель).
- **Экран входа** — полный логотип (знак + «УПРАВЛЕНИЕ ЭКСПЕРИМЕНТАЛЬНОЙ ЗАСТРОЙКИ…») в белом исполнении на фирменном синем фоне (`server-logo-plain.svg`).

## ↩️ Откат

```bash
./brand-talk-desktop.sh /path/to/talk-desktop --restore
```

Возвращает оригинальные `img/` и `forge.config.js`, удаляет `.overrides/`.

## 🤖 Сборка через GitHub Actions (рекомендуется)

В этой песочнице собрать Windows-бинарники нельзя (нет доступа к бинарникам Electron и wine/mono), поэтому сборка выполняется в CI:

1. В своём форке `talk-desktop` создай каталог `branding/` и положи туда содержимое этого комплекта (`.overrides/`, `img/`, `brand-talk-desktop.sh`).
2. Скопируй `build-uez-talk-windows.yml` в `.github/workflows/`.
3. Запусти вручную: **Actions → Build UEZ Talk (Windows x64) → Run workflow** (spreed_ref по умолчанию `stable34`), либо запушь тег `uez-v1.0.0`.
4. Через ~20–30 минут забери артефакты:
   - **UEZ-Talk-installer-exe** — Squirrel-установщик: ставится в `%LocalAppData%\UEZTalk` **без прав администратора**, ярлыки в меню Пуск и на рабочем столе создаются автоматически. Это и есть установка «в профиль пользователя».
   - **UEZ-Talk-portable** — папка с готовой программой: распакуй куда угодно (например, `%LocalAppData%\Programs\UEZ Talk`) и запускай `UEZ Talk.exe` без установки.
   - **UEZ-Talk-installer-msi** — на будущее, для массового развёртывания через GPO/SCCM (машинная установка).
