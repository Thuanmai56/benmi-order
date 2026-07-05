# Specification: Go Backend Refactor & PostgreSQL Migration

## 1. Context & Goal
The objective is to refactor the current JavaScript Cloudflare Worker backend (`worker.js`) into a portable, containerized Go (Golang) REST API. The application will be deployed on Google Cloud Run and backed by a relational PostgreSQL database (e.g., Supabase or Neon). The frontend will be hosted separately on Cloudflare Pages.

---

## 2. Requirements & Behavior

### Database & Storage
- [ ] Migrate data storage from Cloudflare KV to PostgreSQL.
- [ ] Support ACID transactions for order creations and status updates.
- [ ] Retain support for active order tracking to silence the chatbot when staff are manually handling a customer.

### API Endpoints
- [ ] **Config**: Retrieve and update store operating hours.
- [ ] **Menu**: Retrieve the full menu (categories, items, prices) and update it.
- [ ] **Orders**: Create customer orders, retrieve the active list on the staff dashboard, and update order statuses.
- [ ] **Images**: Upload, delete, list, and serve menu images.
- [ ] **Auth**: Simple password-based authentication for staff actions.

### Webhook & Integrations
- [ ] **LINE Webhook**: Receive customer messages, parse text-based orders, generate quick replies (hours, address, delivery), and handle redirection logic.
- [ ] **LINE Signature Verification**: Validate incoming payloads against the LINE channel secret.
- [ ] **Google Sheets Sync**: Send order details to a Google Sheets webhook URL asynchronously when order statuses change.

---

## 3. Technical Design

### Project Directory Layout
```text
/
├── main.go               # Application entrypoint & HTTP server start
├── Dockerfile            # Multi-stage production container build
├── deploy.sh             # GCP Cloud Run deployment script
├── config/
│   └── config.go         # Environment variables & configuration parsing
├── db/
│   ├── db.go             # PostgreSQL connection pool initializer
│   └── migrations.sql    # Schema definition file
├── models/
│   ├── order.go          # Structs for Orders & OrderItems
│   ├── menu.go           # Structs for Menu items & Categories
│   ├── config.go         # Structs for StoreConfig
│   └── image.go          # Structs for Images
├── handlers/
│   ├── auth.go           # HTTP handlers for /api/auth
│   ├── config.go         # HTTP handlers for /api/config
│   ├── menu.go           # HTTP handlers for /api/menu
│   ├── orders.go         # HTTP handlers for /api/orders
│   ├── images.go         # HTTP handlers for /api/images
│   └── webhook.go        # LINE Webhook processor and AI router
└── services/
    ├── line.go           # LINE Bot Client integrations (Push/Reply)
    └── sheets.go         # Google Sheets sync dispatcher (asynchronous)
```

### Relational Database Schema (PostgreSQL)
```sql
-- Store Configuration Table
CREATE TABLE store_config (
    id SERIAL PRIMARY KEY,
    liff_id VARCHAR(255),
    operating_hours JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu Categories
CREATE TABLE menu_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0
);

-- Menu Items
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_small NUMERIC(10, 2) DEFAULT 0,
    price_large NUMERIC(10, 2) DEFAULT 0,
    price_combo NUMERIC(10, 2) DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE
);

-- Orders Table
CREATE TABLE orders (
    key VARCHAR(100) PRIMARY KEY, -- Formatted: BDMMDD-HHMM-RAND
    customer_name VARCHAR(255),
    user_id VARCHAR(255),
    content TEXT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    pickup_time VARCHAR(100),
    note TEXT,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'NEW', -- NEW, ACCEPTED, REJECTED, PICKED_UP, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Active Order tracking (To prevent chatbot intervention)
CREATE TABLE active_orders (
    user_id VARCHAR(255) PRIMARY KEY,
    order_key VARCHAR(100) REFERENCES orders(key) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Images Table (Storing base64 URI strings similar to KV storage)
CREATE TABLE images (
    name VARCHAR(255) PRIMARY KEY,
    data_uri TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Core API Specification

#### 1. Config APIs
* **`GET /api/config`**
  - Response (200): `{"liffId": "liff-xxx", "operatingHours": {...}}`
* **`POST /api/config`**
  - Request Body: `{"operatingHours": {...}}`
  - Response (200): `{"success": true}`

#### 2. Menu APIs
* **`GET /api/menu`**
  - Response (200): `{ "small": {...}, "large": {...}, "combo": {...}, "drinks": {...}, "topping": {...} }`
* **`POST /api/menu`**
  - Request Body: Full JSON menu representation.
  - Response (200): `{"success": true}`

#### 3. Orders APIs
* **`GET /api/orders`**
  - Response (200): Array of latest 200 orders sorted by `created_at` descending.
* **`POST /api/orders/create`**
  - Request Body: `{"customer": "Name", "content": "Items list", "total": 120, "time": "12:30", "note": "No onions", "userId": "line-user-id", "liffFallback": true}`
  - Response (200): `{"success": true, "key": "BD0617-1230-9988"}`

#### 4. Images APIs
* **`GET /api/image_list`** -> Return array of active image names.
* **`GET /api/image?name=xxx`** -> Serve raw image binary with matching `Content-Type`.
* **`POST /api/image`** -> Upload base64 `dataUri` string and save it.
* **`DELETE /api/image`** -> Remove image by name.

---

## 4. Edge Cases & Validation
1. **Duplicate Orders**: Use transaction blocks and check if `orderKey` already exists in `orders` table before saving to prevent race conditions from concurrent LINE requests.
2. **LINE Event Mode**: Skip webhook event loops if `mode == "standby"` (indicating manual chat operator is active).
3. **CORS Handling**: Inject CORS headers matching the frontend Cloudflare Pages domain name.
4. **JWT Auth**: Authenticate HTTP requests modifying store configurations, menu structures, and image lists.

---

## 5. Verification Plan

### Automated/Local Tests
- Run database migration schema locally.
- Run Go backend locally: `PORT=8080 DB_URL="postgres://..." go run main.go`
- Perform API connectivity checks:
  ```bash
  # Check config retrieval
  curl http://localhost:8080/api/config
  
  # Submit a test order
  curl -X POST http://localhost:8080/api/orders/create \
    -H "Content-Type: application/json" \
    -d '{"customer": "Tester", "content": "1 Small Ham Sandwich", "total": 56, "time": "18:00"}'
  ```

### Manual Verification
- Deploy to Google Cloud Run staging.
- Set up a public tunnel (or point LINE console directly to the Cloud Run URL).
- Trigger LINE Webhook requests using test chats and verify the response is sent back correctly.
