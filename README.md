# 🚀 Nexus AI API Gateway & Web Platform

Hệ thống **AI API Gateway** mạnh mẽ, tốc độ cao, hoàn toàn tương thích với chuẩn **OpenAI API** (`/v1/chat/completions`, `/v1/models`), được tối ưu hóa 100% để triển khai miễn phí và tức thì trên **Vercel** (sử dụng Vercel Edge Functions).

Hệ thống kết nối trực tiếp với Upstream API:
- **Upstream Base URL**: `https://api.hcnsec.cn/v1`
- **Mô hình hỗ trợ**: `auto`, `glm-5.3`, `longcat-2.5`, `sensenova-6.8-flash-lite`
- **Tiền tệ**: Việt Nam Đồng (₫) — mỗi tài khoản Discord được tặng **100.000 ₫** vào ví khi đăng nhập lần đầu, mỗi request bị trừ phí cố định (500 ₫ – 1.000 ₫/lượt tuỳ model)

---

## 🌟 Tính Năng Nổi Bật

1. **Chuẩn OpenAI API Hoàn Toàn**:
   - `POST /v1/chat/completions` (hoặc `/api/v1/chat/completions`)
   - `GET /v1/models` (hoặc `/api/v1/models`)
   - `ANY /v1/*` (Proxy tự động cho bất kỳ endpoint nào khác như embeddings, audio,...)
2. **Hỗ Trợ SSE Streaming (Server-Sent Events)**:
   - Truyền tải ký tự mượt mà từng từ một thời gian thực (`stream: true`), không độ trễ.
3. **Ví Tiền Theo Từng User (VND)**:
   - Mỗi tài khoản Discord có ví riêng, khởi tạo **100.000 ₫** khi đăng nhập lần đầu.
   - Mỗi request `/v1/chat/completions` bị **trừ phí cố định**: `auto` & `glm-5.3`: 1.000 ₫/lượt • `longcat-2.5` & `sensenova-6.8-flash-lite`: 500 ₫/lượt.
   - Hết tiền → API trả về **HTTP 402** kèm thông báo số dư. Xem số dư & lịch sử tại `GET /api/wallet`.
   - Admin nạp tiền cho user tại tab **Admin Pool → Nạp Tiền Vào Ví User**.
4. **Giao Diện Web Hiện Đại (All-In-One UI)**:
   - **💬 AI Chat**: Giao diện trò chuyện trực tiếp với AI (Dark Mode, hỗ trợ Markdown, bảng, code syntax highlighting, nút sao chép code).
   - **📄 API Docs**: Tự động sinh mã nguồn tích hợp (cURL, Python, Node.js) và hướng dẫn cấu hình cho **NextChat**, **Chatbox**, **LibreChat**, **Cursor**.
   - **🧪 API Tester**: Bộ công cụ kiểm thử gửi request và xem kết quả trực tiếp trên trình duyệt.
   - **🧠 Models Explorer**: Liệt kê chi tiết các mô hình AI có sẵn từ upstream API.
5. **Bảo Mật & Linh Hoạt**:
   - Giữ bí mật Upstream API Key phía máy chủ (Server/Edge Environment).
   - Bắt buộc đăng nhập **Discord OAuth2** để tạo API Key sử dụng Gateway.
   - Hỗ trợ đầy đủ **CORS** (`Access-Control-Allow-Origin: *`) cho phép gọi từ bất kỳ website hay ứng dụng client-side nào.

---

## 🛠️ Hướng Dẫn Chạy Thử Trên Máy (Local)

Dự án sử dụng Node.js thuần (Zero-dependency), không cần cài đặt các thư viện nặng nề:

```bash
# Di chuyển vào thư mục dự án
cd ai-api-gateway

# Chạy server cục bộ
node server.js
```

Sau khi chạy, truy cập trình duyệt tại: **`http://localhost:3000`**

---

## ☁️ Hướng Dẫn Triển Khai Lên Vercel (Hosting Miễn Phí)

### Cách 1: Triển khai nhanh bằng Vercel CLI (Khuyên dùng)

1. Mở PowerShell hoặc Terminal tại thư mục `ai-api-gateway`:
   ```bash
   npx vercel login
   ```
2. Triển khai sản phẩm lên môi trường Production:
   ```bash
   npx vercel --prod
   ```
3. Vercel sẽ tự động build và trả về đường dẫn trang web của bạn:
   👉 `https://your-project.vercel.app`

---

### Cách 2: Triển khai qua GitHub

1. Khởi tạo Git và đẩy mã nguồn lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy Nexus AI Gateway"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
   git push -u origin main
   ```
2. Truy cập [vercel.com/new](https://vercel.com/new), đăng nhập và chọn **Import** repository vừa tạo.
3. Nhấn **Deploy** (không cần thay đổi cấu hình Build). Vercel sẽ hoàn tất chỉ trong 10-15 giây!

---

## 🔐 Cấu Hình Biến Môi Trường (Environment Variables trên Vercel)

Tại trang quản trị Vercel > Dự án của bạn > **Settings** > **Environment Variables**, bạn có thể cấu hình:

| Tên biến (Key) | Giá trị mặc định | Giải thích |
|---|---|---|
| `UPSTREAM_BASE_URL` | `https://api.hcnsec.cn/v1` | URL API gốc |
| `UPSTREAM_API_KEY` | *(xem `.env.example`)* | Khóa API gốc |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | *(xem `.env.example`)* | Cấu hình Discord OAuth2 |
| `DEFAULT_USER_BALANCE_VND` | `100000` | Số dư tặng mỗi user mới (₫) |
| `CUSTOM_ACCESS_KEY` | *(Để trống)* | Mật khẩu truy cập Gateway (nếu muốn bảo vệ API của bạn khỏi người lạ) |
| `ADMIN_SECRET` | `slk-admin` | Mật khẩu Admin Pool (hoặc dùng đúng Discord ID owner) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *(xem `.env.example`)* | Database Supabase (users, API keys, gate pool, ví tiền) |

> 💳 **Ví tiền (VND)**: số dư và lịch sử giao dịch được lưu trong Supabase (bảng `slk_users.balance_vnd` + `slk_transactions`). Nếu chưa chạy schema mới, hệ thống tự động chạy chế độ bộ nhớ (số dư đúng trong phiên làm việc của server).
> **Bắt buộc chạy lại file `supabase_schema.sql`** trong Supabase SQL Editor để lưu ví tiền bền vững và dùng RPC trừ/cộng tiền atomic.

---

## 💻 Cách Sử Dụng API Cho Ứng Dụng Khác

### 1. Python (OpenAI SDK)

```python
from openai import OpenAI

# Khởi tạo client trỏ về Vercel Gateway
client = OpenAI(
    base_url="https://your-project.vercel.app/v1",
    api_key="any-key"  # Hoặc CUSTOM_ACCESS_KEY nếu đã thiết lập
)

response = client.chat.completions.create(
    model="DeepSeek-V4-Flash",  # hoặc "auto", "glm-5.3", "kimi-k3"
    messages=[
        {"role": "user", "content": "Xin chào! Bạn là ai?"}
    ],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

### 2. Node.js / JavaScript

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://your-project.vercel.app/v1',
  apiKey: 'any-key',
});

const stream = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Xin chào!' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

### 3. cURL

```bash
curl -X POST "https://your-project.vercel.app/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer any-key" \
  -d '{
    "model": "auto",
    "messages": [
      { "role": "user", "content": "Xin chào thế giới!" }
    ],
    "stream": true
  }'
```

---

### 4. Cấu hình vào các ứng dụng phổ biến (Chatbox, NextChat, LibreChat)

- **Chatbox**:
  - Provider: `OpenAI API`
  - API Host: `https://your-project.vercel.app/v1`
  - API Key: `any-key`
- **NextChat (ChatGPT-Next-Web)**:
  - Model Provider: `OpenAI`
  - Endpoint: `https://your-project.vercel.app`
  - Custom Models: `auto,DeepSeek-V4-Flash,DeepSeek-V4-Pro,glm-5.3,kimi-k3`

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
ai-api-gateway/
├── api/
│   ├── _utils.js                 # Logic proxy, CORS, xác thực và streaming
│   ├── proxy.js                  # Catch-all Edge handler cho /v1/*
│   ├── health.js                 # Endpoint kiểm tra trạng thái hệ thống
│   └── v1/
│       ├── chat/
│       │   └── completions.js    # Vercel Edge Function cho /v1/chat/completions
│       └── models.js             # Vercel Edge Function cho /v1/models
├── public/
│   ├── index.html                # Giao diện Web SPA (Chat, Docs, Playground, Models)
│   ├── app.js                    # Logic client xử lý SSE stream và UI
│   └── style.css                 # Giao diện Dark theme, typography & hiệu ứng
├── server.js                     # Máy chủ Node.js local chạy không cần cài package
├── vercel.json                   # Cấu hình rewrite & CORS cho Vercel Edge
├── package.json                  # Tệp cấu hình dự án
├── .env                          # Biến môi trường local
├── .env.example                  # Mẫu biến môi trường
└── README.md                     # Tài liệu dự án
```
