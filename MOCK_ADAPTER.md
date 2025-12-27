# 🤖 Mock WhatsApp Adapter - Development Mode

## ✅ What is This?

The **Mock WhatsApp Adapter** is a **simplified version** of the WhatsApp connection that:
- ✅ **NO Chromium/Puppeteer required** - Works instantly on Windows
- ✅ **Auto-connects** - QR code auto-"scans" after 5 seconds
- ✅ **Full testing** - Test all features without real WhatsApp
- ✅ **Same interface** - Drop-in replacement for production adapter

---

## 🎯 Current Setup

**Backend is using MOCK adapter** for development:

```typescript
// backend/src/api/routes/botRoutes.ts
import { whatsappAdapter } from '../../adapters/whatsapp/whatsappAdapter.mock';
```

---

## 🚀 How It Works

### **1. Create Bot**
- Create bot via dashboard ✅
- Bot stored in database ✅

### **2. Connect to WhatsApp (MOCK)**
- Click "Connect to WhatsApp"
- QR code generates instantly ✅
- **Auto-connects after 5 seconds** 🎉
- Status changes to "Connected" ✅

### **3. Create Rules**
- Create keyword rules ✅
- Rules stored in database ✅

### **4. Test Auto-Reply (MOCK)**
Use the mock adapter's test function:

```typescript
// Simulate incoming message
await whatsappAdapter.simulateIncomingMessage(
    botId,
    '+1234567890',
    'hello'
);
```

---

## 📋 Features Available

| Feature | Status | Notes |
|---------|--------|-------|
| Bot Creation | ✅ Works | Real database |
| QR Generation | ✅ Works | Mock QR code |
| Auto-Connect | ✅ Works | 5 second delay |
| Rule Creation | ✅ Works | Real database |
| Message Sending | ✅ Works | Logged only |
| Message Receiving | ✅ Works | Via simulate function |
| Event Logging | ✅ Works | Real database |
| Analytics | ✅ Works | Real data |

---

## 🔄 Switch to Real WhatsApp

When ready for production:

### **Step 1: Install Chromium Dependencies**

**Windows:**
```bash
# Install Chromium via Puppeteer
cd backend
npx puppeteer browsers install chrome
```

**Linux:**
```bash
sudo apt-get install -y chromium-browser
```

### **Step 2: Update Import**

Edit `backend/src/api/routes/botRoutes.ts`:

```typescript
// BEFORE (Mock):
import { whatsappAdapter } from '../../adapters/whatsapp/whatsappAdapter.mock';

// AFTER (Real):
import { whatsappAdapter } from '../../adapters/whatsapp/whatsappAdapter';
```

### **Step 3: Restart Backend**

```bash
cd backend
npm run dev
```

---

## 🧪 Testing with Mock Adapter

### **Test 1: Bot Connection**

1. Create bot
2. Click "Connect to WhatsApp"
3. Wait 5 seconds
4. Status should change to "Connected" ✅

### **Test 2: Rule Creation**

1. Go to "Rules" page
2. Create rule: keyword "hello", reply "Hi there!"
3. Rule saved to database ✅

### **Test 3: Auto-Reply (Manual)**

Open backend terminal and run:

```typescript
// In backend console or test file
import { whatsappAdapter } from './src/adapters/whatsapp/whatsappAdapter.mock';

// Simulate incoming message
await whatsappAdapter.simulateIncomingMessage(
    'your-bot-id',
    '+1234567890',
    'hello'
);

// Check logs - should trigger rule and send reply
```

---

## 🎨 Mock vs Real Comparison

| Aspect | Mock Adapter | Real Adapter |
|--------|--------------|--------------|
| **Setup** | Zero config | Needs Chromium |
| **Speed** | Instant | 10-30 seconds |
| **QR Code** | Fake (auto-connects) | Real WhatsApp QR |
| **Messages** | Simulated | Real WhatsApp |
| **Testing** | Perfect for dev | Production only |
| **Database** | Real | Real |
| **Events** | Real | Real |

---

## 🔧 Troubleshooting

### **QR Code Still Not Showing?**

Check backend logs:
```
[MOCK] Generating QR code { bot_id: 'xxx' }
[MOCK] Simulating WhatsApp connection { bot_id: 'xxx' }
[MOCK] Bot connected successfully { bot_id: 'xxx' }
```

### **Auto-Connect Not Working?**

- Wait 5 seconds after QR generation
- Check frontend is polling `/api/bots/:id/status`
- Refresh page

### **Want Real WhatsApp Now?**

Follow "Switch to Real WhatsApp" section above.

---

## 📊 What Gets Logged

Mock adapter logs everything:

```
[MOCK] Initializing bot { bot_id: 'xxx' }
[MOCK] Generating QR code { bot_id: 'xxx' }
[MOCK] Simulating WhatsApp connection { bot_id: 'xxx' }
[MOCK] Bot connected successfully { bot_id: 'xxx' }
[MOCK] Sending message { bot_id: 'xxx', recipient: '+xxx', content: 'Hi!' }
[MOCK] Simulated incoming message { bot_id: 'xxx', from: '+xxx', content: 'hello' }
```

All events are stored in `event_logs` table!

---

## ✅ Summary

**Current Status:**
- ✅ Mock adapter active
- ✅ QR generation works
- ✅ Auto-connect works
- ✅ Database fully functional
- ✅ Ready for testing!

**Next Steps:**
1. Test bot creation & connection
2. Test rule creation
3. Test auto-reply (manual simulation)
4. When ready: Switch to real WhatsApp adapter

---

**The platform is 100% functional with mock adapter!** 🎉

You can test all features without needing real WhatsApp connection.
