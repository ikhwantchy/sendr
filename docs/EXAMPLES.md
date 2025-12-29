# Example Configurations

This file contains real-world examples of how to configure various features of the platform.

---

## 🤖 Bot Configuration Examples

### Basic Bot
```json
{
  "name": "Customer Service Bot",
  "config": {
    "auto_reply": true,
    "working_hours": {
      "enabled": true,
      "start": "09:00",
      "end": "18:00",
      "timezone": "Asia/Jakarta"
    }
  }
}
```

---

## 📝 Keyword Rule Examples

### 1. Simple Text Reply
```json
{
  "name": "Greeting",
  "keyword": "halo",
  "match_type": "equals",
  "scope": "global",
  "priority": 10,
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "Halo! Selamat datang di layanan kami. Ada yang bisa kami bantu?"
      }
    }
  ]
}
```

### 2. Price Inquiry with Contains Match
```json
{
  "name": "Price Inquiry",
  "keyword": "harga",
  "match_type": "contains",
  "scope": "global",
  "priority": 8,
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "Untuk informasi harga, silakan hubungi:\n📞 0812-3456-7890\n📧 sales@example.com\n\nAtau kunjungi website kami: www.example.com"
      }
    }
  ]
}
```

### 3. Regex Pattern Match
```json
{
  "name": "Order Number Check",
  "keyword": "^ORDER-[0-9]{6}$",
  "match_type": "regex",
  "scope": "global",
  "priority": 9,
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "Terima kasih! Kami sedang mengecek status pesanan Anda. Mohon tunggu sebentar..."
      }
    },
    {
      "type": "FETCH_SPREADSHEET",
      "config": {
        "data_source_id": "order-database-uuid",
        "filters": {
          "order_number": "{{message}}"
        },
        "store_as": "order_data"
      }
    },
    {
      "type": "COMPOSE_MESSAGE",
      "config": {
        "template": "Status Pesanan {{order_number}}:\n\nStatus: {{status}}\nTanggal: {{date}}\nEstimasi: {{estimate}}\n\nTerima kasih!",
        "data_source_id": "order-database-uuid"
      }
    }
  ]
}
```

### 4. Group-Specific Rule
```json
{
  "name": "Group Admin Command",
  "keyword": "/help",
  "match_type": "equals",
  "scope": "group",
  "scope_target": "120363012345678901@g.us",
  "priority": 10,
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "📋 Perintah yang tersedia:\n/info - Informasi grup\n/rules - Aturan grup\n/contact - Hubungi admin"
      }
    }
  ]
}
```

### 5. Contact-Specific Rule
```json
{
  "name": "VIP Customer Auto Reply",
  "keyword": ".*",
  "match_type": "regex",
  "scope": "contact",
  "scope_target": "6281234567890@c.us",
  "priority": 15,
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "Terima kasih {{nama}}! Sebagai pelanggan VIP, pesan Anda akan segera kami prioritaskan. Tim kami akan menghubungi Anda dalam 5 menit."
      }
    }
  ]
}
```

### 6. Multi-Action Rule
```json
{
  "name": "Product Catalog Request",
  "keyword": "katalog",
  "match_type": "contains",
  "scope": "global",
  "priority": 7,
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "Berikut adalah katalog produk kami:"
      }
    },
    {
      "type": "SEND_IMAGE",
      "config": {
        "image_url": "https://example.com/catalog.jpg",
        "caption": "Katalog Produk 2024\n\nUntuk pemesanan, hubungi:\n📱 0812-3456-7890"
      }
    },
    {
      "type": "FETCH_SPREADSHEET",
      "config": {
        "data_source_id": "product-list-uuid",
        "store_as": "products"
      }
    },
    {
      "type": "COMPOSE_MESSAGE",
      "config": {
        "template": "Produk Terlaris:\n{{list}}",
        "data_source_id": "product-list-uuid"
      }
    }
  ]
}
```

---

## 📊 Data Source Examples

### 1. Google Sheets - Customer Database
```json
{
  "name": "Customer Database",
  "type": "google_sheets",
  "connection_config": {
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "sheet_name": "Customers",
    "range": "A:F"
  },
  "column_mapping": {
    "nama": "Name",
    "email": "Email",
    "phone": "Phone",
    "status": "Status",
    "join_date": "Join Date"
  },
  "cache_ttl": 300
}
```

### 2. Google Sheets - Product List
```json
{
  "name": "Product Catalog",
  "type": "google_sheets",
  "connection_config": {
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "sheet_name": "Products",
    "range": "A:E"
  },
  "column_mapping": {
    "nama_produk": "Product Name",
    "harga": "Price",
    "stok": "Stock",
    "kategori": "Category",
    "deskripsi": "Description"
  },
  "cache_ttl": 600
}
```

### 3. CSV Data Source
```json
{
  "name": "Order History",
  "type": "csv",
  "connection_config": {
    "url": "https://example.com/data/orders.csv"
  },
  "column_mapping": {
    "order_id": "OrderID",
    "customer": "CustomerName",
    "total": "Total",
    "status": "Status"
  },
  "cache_ttl": 180
}
```

### 4. REST API Data Source
```json
{
  "name": "Weather API",
  "type": "api",
  "connection_config": {
    "url": "https://api.weather.com/v1/current",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer YOUR_API_KEY"
    }
  },
  "column_mapping": {
    "temperature": "temp",
    "humidity": "humidity",
    "condition": "weather.main"
  },
  "cache_ttl": 300
}
```

---

## ⏰ Reminder Examples

### 1. Daily Morning Reminder
```json
{
  "name": "Daily Morning Greeting",
  "cron_expression": "0 9 * * *",
  "scope": "global",
  "message_template": "Selamat pagi! 🌅\n\nJangan lupa untuk:\n✅ Check email\n✅ Review tasks\n✅ Stay hydrated\n\nSemangat!",
  "is_active": true
}
```

### 2. Weekly Report to Group
```json
{
  "name": "Weekly Sales Report",
  "cron_expression": "0 17 * * 5",
  "scope": "group",
  "scope_target": "120363012345678901@g.us",
  "message_template": "📊 Laporan Penjualan Mingguan\n\nTotal Penjualan: {{total_sales}}\nProduk Terlaris: {{top_product}}\nCustomer Baru: {{new_customers}}\n\nGreat job team! 🎉",
  "data_source_id": "sales-data-uuid",
  "is_active": true
}
```

### 3. Monthly Invoice Reminder
```json
{
  "name": "Monthly Invoice Reminder",
  "cron_expression": "0 10 1 * *",
  "scope": "contact",
  "scope_target": "6281234567890@c.us",
  "message_template": "Halo {{nama}},\n\nIni adalah pengingat bahwa invoice bulan ini sudah tersedia:\n\nTotal: Rp {{total}}\nJatuh Tempo: {{due_date}}\n\nSilakan lakukan pembayaran sebelum tanggal jatuh tempo.\n\nTerima kasih!",
  "data_source_id": "invoice-data-uuid",
  "is_active": true
}
```

### 4. Event Reminder
```json
{
  "name": "Webinar Reminder",
  "cron_expression": "0 8 15 * *",
  "scope": "global",
  "message_template": "🎓 Reminder: Webinar Hari Ini!\n\nTopic: {{topic}}\nWaktu: {{time}}\nSpeaker: {{speaker}}\nLink: {{link}}\n\nJangan sampai ketinggalan!",
  "data_source_id": "webinar-schedule-uuid",
  "is_active": true
}
```

---

## 📢 Campaign/Blast Examples

### 1. Simple Text Broadcast
```json
{
  "name": "Product Launch Announcement",
  "message_type": "text",
  "message_template": "🎉 PRODUCT BARU!\n\nKami dengan bangga memperkenalkan produk terbaru kami!\n\n✨ Fitur unggulan\n💰 Harga spesial\n🚚 Gratis ongkir\n\nOrder sekarang: wa.me/6281234567890",
  "target_type": "all",
  "throttle_config": {
    "delay_min": 2000,
    "delay_max": 5000,
    "batch_size": 10
  }
}
```

### 2. Personalized Broadcast
```json
{
  "name": "Birthday Greetings",
  "message_type": "text",
  "message_template": "🎂 Selamat Ulang Tahun {{nama}}!\n\nSemoga panjang umur, sehat selalu, dan sukses!\n\nSebagai hadiah, kami berikan diskon 20% untuk pembelian Anda hari ini.\n\nKode: BDAY{{phone}}\n\nSalam hangat,\nTim {{company}}",
  "target_type": "custom",
  "target_list": ["6281234567890@c.us", "6289876543210@c.us"],
  "data_source_id": "customer-database-uuid",
  "throttle_config": {
    "delay_min": 3000,
    "delay_max": 6000,
    "batch_size": 5
  }
}
```

### 3. Image Broadcast
```json
{
  "name": "Flash Sale Promo",
  "message_type": "image",
  "message_template": "⚡ FLASH SALE!\n\nDiskon hingga 50% untuk semua produk!\n\nBerlaku hari ini saja!\n\nOrder: {{order_link}}",
  "media_url": "https://example.com/flash-sale.jpg",
  "target_type": "groups",
  "throttle_config": {
    "delay_min": 1000,
    "delay_max": 3000,
    "batch_size": 15
  }
}
```

### 4. Targeted Campaign with Data
```json
{
  "name": "VIP Customer Exclusive",
  "message_type": "text",
  "message_template": "Halo {{nama}},\n\nSebagai pelanggan VIP kami, Anda mendapat akses eksklusif ke:\n\n🌟 Produk Pre-Order\n💎 Diskon 30%\n🎁 Free Gift\n\nTotal Belanja Anda: Rp {{total_spent}}\nPoin Loyalty: {{points}}\n\nKlaim sekarang: {{claim_link}}",
  "target_type": "custom",
  "data_source_id": "vip-customers-uuid",
  "throttle_config": {
    "delay_min": 5000,
    "delay_max": 10000,
    "batch_size": 3
  }
}
```

---

## 🎨 Template Variable Examples

### Available Variables

```
{{nama}}          - Customer name
{{email}}         - Email address
{{phone}}         - Phone number
{{tanggal}}       - Current date (formatted)
{{list}}          - Array as numbered list
{{order_id}}      - Order ID
{{status}}        - Status
{{total}}         - Total amount
{{company}}       - Company name

... any column from your data source
```

### Template Examples

#### Customer Welcome
```
Halo {{nama}}! 👋

Terima kasih telah bergabung dengan kami pada {{tanggal}}.

Email Anda: {{email}}
Phone: {{phone}}

Selamat berbelanja!
```

#### Order Confirmation
```
✅ Pesanan Dikonfirmasi

Order ID: {{order_id}}
Tanggal: {{tanggal}}
Total: Rp {{total}}
Status: {{status}}

Estimasi pengiriman: {{estimate}}

Terima kasih!
```

#### List Template
```
📋 Produk Tersedia:

{{list}}

Untuk order, hubungi:
📱 {{phone}}
```

---

## 🔧 Action Configuration Examples

### SEND_TEXT
```json
{
  "type": "SEND_TEXT",
  "config": {
    "message": "Halo {{nama}}, terima kasih telah menghubungi kami!",
    "variables": {
      "nama": "Customer Name"
    }
  }
}
```

### SEND_IMAGE
```json
{
  "type": "SEND_IMAGE",
  "config": {
    "image_url": "https://example.com/promo.jpg",
    "caption": "Promo spesial untuk {{nama}}!\n\nDiskon {{discount}}%",
    "variables": {
      "nama": "Customer",
      "discount": "20"
    }
  }
}
```

### FETCH_SPREADSHEET
```json
{
  "type": "FETCH_SPREADSHEET",
  "config": {
    "data_source_id": "customer-db-uuid",
    "filters": {
      "phone": "{{phone}}"
    },
    "store_as": "customer_data"
  }
}
```

### COMPOSE_MESSAGE
```json
{
  "type": "COMPOSE_MESSAGE",
  "config": {
    "template": "Halo {{nama}},\n\nSaldo Anda: Rp {{balance}}\nPoin: {{points}}\n\nTerima kasih!",
    "data_source_id": "customer-db-uuid",
    "variables": {
      "company": "PT Example"
    }
  }
}
```

### TRIGGER_REMINDER
```json
{
  "type": "TRIGGER_REMINDER",
  "config": {
    "reminder_id": "reminder-uuid",
    "delay_seconds": 3600
  }
}
```

---

## 📅 Cron Expression Examples

```
0 9 * * *          - Every day at 9:00 AM
0 17 * * 5         - Every Friday at 5:00 PM
0 10 1 * *         - First day of month at 10:00 AM
*/30 * * * *       - Every 30 minutes
0 8-17 * * 1-5     - Every hour from 8 AM to 5 PM, Monday to Friday
0 0 * * 0          - Every Sunday at midnight
0 12 * * 1,3,5     - Monday, Wednesday, Friday at noon
```

---

## 🎯 Complete Use Case Examples

### Use Case 1: Customer Service Bot

**Keyword Rules:**
1. "halo" → Welcome message
2. "harga" → Price list
3. "order" → Order instructions
4. "status" → Check order status
5. "komplain" → Escalate to human

**Data Sources:**
- Customer database (Google Sheets)
- Product catalog (Google Sheets)
- Order tracking (API)

**Reminders:**
- Daily: Check pending orders
- Weekly: Send newsletter

### Use Case 2: E-commerce Bot

**Keyword Rules:**
1. Product name → Product details
2. "katalog" → Send catalog
3. "ORDER-######" → Order status
4. "bayar" → Payment instructions

**Campaigns:**
- Flash sale announcements
- New product launches
- Birthday greetings
- Abandoned cart reminders

### Use Case 3: Community Management Bot

**Keyword Rules:**
1. "/help" → Command list
2. "/rules" → Group rules
3. "/event" → Upcoming events
4. "/contact" → Admin contact

**Reminders:**
- Daily: Morning greeting
- Weekly: Event reminder
- Monthly: Community report

---

**Need more examples?**
Check the ARCHITECTURE.md for detailed explanations of how each component works!

---

**Built with ❤️ by Anti-Gravity**
