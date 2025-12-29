# My API Documentation

## Introduction
This API provides access to data about our services.

## Authentication
To authenticate, include your API key in the `X-API-Key` header.

### Example
`X-API-Key: YOUR_API_KEY`

## Endpoints

### 1. Get All Items

**GET `/items`**

Retrieves a list of all available items.

#### Parameters
None.

#### Responses

**200 OK**
```json
[
  {
    "id": "item123",
    "name": "Example Item 1",
    "description": "This is the first example item."
  },
  {
    "id": "item456",
    "name": "Example Item 2",
    "description": "This is the second example item."
  }
]
```

#### Example Request
```bash
curl -X GET \
  'https://api.example.com/items' \
  -H 'X-API-Key: YOUR_API_KEY'
```

### 2. Create a New Item

**POST `/items`**

Creates a new item with the provided details.

#### Parameters

**Request Body (application/json)**
| Field       | Type   | Required | Description              |
|-------------|------------------|--------------------------|--------------------------|
| `name`      | string | Yes      | The name of the new item.|
| `description` | string | No       | A description for the item.|

```json
{
  "name": "New Awesome Item",
  "description": "A fantastic new item to add."
}
```

#### Responses

**201 Created**
```json
{
  "id": "item789",
  "name": "New Awesome Item",
  "description": "A fantastic new item to add."
}
```

**400 Bad Request**
```json
{
  "error": "Missing required field: name"
}
```

#### Example Request
```bash
curl -X POST \
  'https://api.example.com/items' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: YOUR_API_KEY' \
  -d '{
    "name": "New Awesome Item",
    "description": "A fantastic new item to add."
  }'
```

## Error Codes
*   `401 Unauthorized`: Invalid or missing API key.
*   `404 Not Found`: The requested resource does not exist.
