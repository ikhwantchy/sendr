# ✅ EXCEL/CSV UPLOAD ADDED!

## 🎉 **NEW FEATURE:**

Campaign sekarang bisa **UPLOAD FILE** untuk contact list!

**Supported formats:**
- ✅ CSV (.csv)
- ✅ Excel (.xlsx, .xls)
- ✅ Text (.txt)

---

## 🚀 **HOW TO USE:**

### **Option 1: Upload File** (EASY!)

1. Go to Campaigns
2. Click "New Campaign"
3. Fill bot, name, message
4. Select "Specific Numbers"
5. **Click "📁 Upload Excel/CSV File"**
6. Choose your file
7. System will auto-parse phone numbers!
8. Click "Create & Send"

### **Option 2: Manual Input** (OLD WAY)

Still works! Just type numbers separated by comma.

---

## 📝 **FILE FORMAT:**

**CSV Example:**
```csv
6281234567890
6289876543210
6285551234567
```

**OR with names:**
```csv
Name,Phone
John,6281234567890
Jane,6289876543210
```

**OR Excel:**
Just put phone numbers in any column!

---

## ⚠️ **IMPORTANT:**

**Phone numbers must include country code!**
- ✅ `6281234567890` (Indonesia)
- ❌ `081234567890` (Missing 62)

**System will:**
- Extract all numbers from file
- Remove non-digit characters
- Show count: "✅ Found X phone numbers"

---

## 🧪 **TEST:**

1. **Create test file:** `contacts.csv`
```
6281234567890
6289876543210
```

2. **Upload in campaign form**
3. **Should see:** "✅ Found 2 phone numbers"
4. **Click Create & Send**

---

## 🎯 **BENEFITS:**

**Before:**
- ❌ Manual input satu-satu
- ❌ Copy-paste ribet
- ❌ Error prone

**After:**
- ✅ Upload file langsung
- ✅ Auto-parse numbers
- ✅ Mudah & cepat!

---

## 📊 **EXAMPLE FILES:**

### **Simple CSV:**
```csv
6281234567890
6289876543210
6285551234567
```

### **With Headers:**
```csv
Phone
6281234567890
6289876543210
```

### **Excel Format:**
| Name | Phone |
|------|-------|
| John | 6281234567890 |
| Jane | 6289876543210 |

**All formats work!** System extracts numbers automatically!

---

## 🔧 **REFRESH FRONTEND:**

```bash
# Just refresh browser (Ctrl+R)
```

---

## ⚠️ **ABOUT CAMPAIGN ERROR:**

Campaign error might be because:
1. Bot not connected
2. Backend issue
3. Database issue

**Check backend logs** for exact error!

**If still error, try:**
1. Restart backend
2. Check bot is connected
3. Test with 1 number first

---

**Refresh frontend dan test upload file!** 🚀

Much easier than manual input! ✅
