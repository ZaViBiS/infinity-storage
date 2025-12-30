# infinity-storage

використовує telegram для зберігання необмеженої кількості даних

# GET: /

загалом нічого

*respone*
200 OK

# GET: /get_api_key

генерує унікальний api ключ

*respone*

```json
{
  "key": "YOUR_API_KEY",
}
```

# POST: /upload

Завантажує файл у єдиному `multipart/form-data` запиті. Ім'я файлу та його розмір
витягуються безпосередньо з multipart-форми. Сервер спочатку створює тимчасовий запис файлу,
обробляє частини, а потім оновлює метадані файлу з фактичним ім'ям та розміром
після завершення завантаження.

*request*

Надішліть `POST` запит з `Content-Type: multipart/form-data`. Файл має бути
частиною форми з `name="file"`.

Приклад використання `curl`:
```bash
curl -X POST -H "Authorization: Bearer YOUR_API_KEY" \
     -F "file=@/path/to/your/file.txt" \
     http://localhost:8081/upload
```

*response*
202 Accepted (HTTP Status Code)

##### TODO

- [ ] шифрування
- [ ] стискання
- [ ] список файлів
- [ ] завантаження файлу
- [ ] видалення файлу
- [x] динамічне отримання метаданих файлу під час завантаження
