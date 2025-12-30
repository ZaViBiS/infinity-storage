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
  "chunk_size": 7500000, # 7,5 MB
}
```

# POST: /send_chunk

*request*

```json
{
  "file_id": "YOUR_UNIQU_FILE_ID",
  "chunk_position": 1,
  "data": "RAW_DATA_IN_BYTES",
  "key": "YOUR_API_KEY",
}
```
