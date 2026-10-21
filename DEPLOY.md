# Как запустить вторую часть на своём сервере

Вторая часть живёт **рядом с первой** и её не трогает. Это отдельная папка, отдельный мир и отдельный порт. Первая часть продолжает работать как раньше.

Нужен тот же VPS, где уже стоит первая часть. Docker там уже установлен.

## 1. Скопировать игру на сервер

Удобнее всего клонировать репозиторий второй части в отдельную папку:

```bash
git clone git@github.com:Predator051/dc_together_2.git ~/bezgomin2
```

Можно и с компьютера, из папки проекта (вместо `root@1.2.3.4` подставьте пользователя и IP сервера):

```bash
rsync -av --exclude node_modules --exclude dist --exclude client/dist --exclude deploy/data ./ root@1.2.3.4:~/bezgomin2/
```

## 2. Перенести героев из первой части

Вторая часть продолжает историю ваших героев: подхватит их имена, роли и то, чем закончилась первая часть. Для этого ей нужна копия мира первой части. Сама первая часть при этом не меняется: мы только читаем копию.

Сделать свежую копию мира первой части и положить её во вторую:

```bash
cd ~/bezgomin/deploy && docker compose exec game node dist/backup.js
mkdir -p ~/bezgomin2/deploy/data
cp "$(ls -t ~/bezgomin/deploy/data/backups/*.db | head -1)" ~/bezgomin2/deploy/data/part1.db
```

Если этот шаг пропустить, вторая часть начнётся с «усреднённой» концовки, а героев вы создадите заново.

## 3. Первый запуск

```bash
cd ~/bezgomin2/deploy && cp .env.example .env && nano .env
```

В `.env` впишите код приглашения, например `INVITE_CODE=SOLE-2026`. Порт оставьте `8081`, пока работает первая часть. Сохраните (Ctrl+O, Enter, Ctrl+X) и запустите:

```bash
docker compose up -d --build
```

Через минуту игра откроется по адресу `http://IP-сервера:8081/`. Если в настройках сервера есть файрвол, откройте порт 8081:

```bash
ufw allow 8081
```

Если герои перенесены из первой части, при входе нажмите «Я — …» со своим именем. Если нет, создайте персонажей заново.

Посмотреть код приглашения, если он не задан в `.env`:

```bash
docker compose logs game | grep "Invite code"
```

## 4. Когда первая часть пройдена

Первую часть можно остановить, а вторую перевести на обычный адрес (80/443 или ваш домен):

```bash
cd ~/bezgomin/deploy && docker compose down
cd ~/bezgomin2/deploy && nano .env
```

В `.env` поставьте `HTTP_PORT=80`, `HTTPS_PORT=443`, а для домена — `SITE_ADDRESS=ваш.домен`. Затем:

```bash
docker compose up -d
```

Мир первой части при этом не удаляется: он остаётся в `~/bezgomin/deploy/data`.

## 5. Обновление после нового акта

```bash
cd ~/bezgomin2 && git pull && cd deploy && docker compose exec game node dist/backup.js && docker compose up -d --build
```

Сначала делается резервная копия мира, потом игра пересобирается. Мир хранится в `~/bezgomin2/deploy/data` и переживает обновления.

## 6. Резервная копия мира

Сделать копию вручную:

```bash
cd ~/bezgomin2/deploy && docker compose exec game node dist/backup.js
```

Копии лежат в `~/bezgomin2/deploy/data/backups/`. Сервер сам делает копию при каждом запуске (хранятся последние 10).

Восстановить мир из копии (подставьте имя нужного файла):

```bash
cd ~/bezgomin2/deploy && docker compose stop game && cp data/backups/ИМЯ-ФАЙЛА.db data/world.db && rm -f data/world.db-wal data/world.db-shm && docker compose start game
```

## Полезное

- Логи: `docker compose logs -f game`
- Перезапуск: `docker compose restart`
- Остановить: `docker compose down` (мир сохраняется)
