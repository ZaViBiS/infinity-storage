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

# POST: /new

створення нового файлу для завантаження

*request*

```json
{
  "filename": "YOUR_FILE_NAME",
  "size": 15000000, # 15 MB in bytes
  "key": "YOUR_API_KEY",
}
```

*resopne*

```json
{
  "file_id": "YOUR_UNIQU_FILE_ID",
  "number_of_chunks": 2,
}
```

# POST: /send_chunk

*request*

data = raw bytes

```json
{
  "file_id": "YOUR_UNIQU_FILE_ID",
  "chunk_position": 0,
  "key": "YOUR_API_KEY",
}
```

##### треба додати можливість: завантажувати і переглядати файли які були завантажені
