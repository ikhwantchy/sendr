# ✅ CAMPAIGN CSV & PREVIEW - COMPLETE!

## 🎯 FITUR BARU YANG DITAMBAHKAN

### **1. Smart CSV Parsing** ✅
**Support Multiple Formats:**
```csv
# Format 1: name,phone (Excel format)
Ikhwan,62-857105569058
Aura,62-88716016402

# Format 2: phone,name
62857105569058,Ikhwan
6288716016402,Aura

# Format 3: phone only
62857105569058
6288716016402
```

**Auto-Detection:**
- ✅ Deteksi otomatis kolom mana yang phone/name
- ✅ Skip header row otomatis
- ✅ Clean phone numbers (remove spaces, dashes)
- ✅ Support both formats

**Implementation:**
```typescript
// Smart column detection
const firstIsPhone = /^\+?\d+$/.test(parts[0].replace(/[\s-]/g, ''))
const secondIsPhone = /^\+?\d+$/.test(parts[1].replace(/[\s-]/g, ''))

if (firstIsPhone) {
    // Format: phone,name
    parsedContacts.push({
        phone: parts[0].replace(/[^\d+]/g, ''),
        name: parts[1] || ''
    })
} else if (secondIsPhone) {
    // Format: name,phone (Excel format)
    parsedContacts.push({
        phone: parts[1].replace(/[^\d+]/g, ''),
        name: parts[0] || ''
    })
}
```

---

### **2. Template Variables** ✅
**Supported Variables:**
- `{{name}}` - Replaced with contact name
- `{{phone}}` - Replaced with phone number

**Example:**
```
Template:
"Halo {{name}}, promo spesial untuk nomor {{phone}}!"

Output for Ikhwan:
"Halo Ikhwan, promo spesial untuk nomor 62857105569058!"

Output for contact without name:
"Halo Customer, promo spesial untuk nomor 6288716016402!"
```

**Implementation:**
```typescript
const replaceVariables = (template: string, contact: Contact): string => {
    return template
        .replace(/\{\{name\}\}/gi, contact.name || 'Customer')
        .replace(/\{\{phone\}\}/gi, contact.phone)
}
```

---

### **3. WhatsApp-Style Message Preview** ✅

#### **Live Preview (Right Panel):**
```
┌─────────────────────────────────────┐
│ 📱 Message Preview                  │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [I] Ikhwan                      │ │
│ │ [Image if uploaded]             │ │
│ │ Halo Ikhwan, promo spesial!     │ │
│ │                          18:26  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [A] Aura                        │ │
│ │ [Image if uploaded]             │ │
│ │ Halo Aura, promo spesial!       │ │
│ │                          18:26  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ... and 23 more contacts            │
│                                     │
│ ✅ Variables replaced               │
│ ✅ Sent one by one                  │
│ ✅ Total: 25 recipients             │
└─────────────────────────────────────┘
```

**Features:**
- ✅ WhatsApp green bubble design
- ✅ Avatar with initial
- ✅ Contact name display
- ✅ Image preview (if uploaded)
- ✅ Variable replacement shown
- ✅ Timestamp
- ✅ Shows first 3 contacts
- ✅ Real-time update

#### **Full Preview Modal:**
```
Click "👁️ Preview" button to see:

┌─────────────────────────────────────┐
│ 📱 Full Message Preview             │
├─────────────────────────────────────┤
│                                     │
│ [Scrollable list of ALL contacts]  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [I] Ikhwan                      │ │
│ │     62857105569058              │ │
│ │ [Image]                         │ │
│ │ Halo Ikhwan, promo spesial!     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [A] Aura                        │ │
│ │     6288716016402               │ │
│ │ [Image]                         │ │
│ │ Halo Aura, promo spesial!       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ... (all 25 contacts shown)         │
│                                     │
│ [Close Preview]                     │
└─────────────────────────────────────┘
```

**Features:**
- ✅ Full scrollable list
- ✅ All contacts shown
- ✅ Name + phone number
- ✅ Avatar with initial
- ✅ Image preview
- ✅ Exact message for each contact
- ✅ Modal overlay

---

## 🎨 UI IMPROVEMENTS

### **Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ Create Campaign                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────┐  ┌─────────────────────────────┐│
│ │ LEFT: Form          │  │ RIGHT: Live Preview         ││
│ │                     │  │                             ││
│ │ - Bot Selection     │  │ 📱 Message Preview          ││
│ │ - Campaign Name     │  │                             ││
│ │ - Message Template  │  │ [WhatsApp-style bubbles]    ││
│ │   💡 Use {{name}}   │  │                             ││
│ │ - Image Upload      │  │ ✅ Variables replaced       ││
│ │ - Target Type       │  │ ✅ Sent one by one          ││
│ │ - CSV Upload        │  │ ✅ Total: 25 recipients     ││
│ │ - Manual Input      │  │                             ││
│ │ - Contact Table     │  │                             ││
│ │                     │  │                             ││
│ │ [Cancel] [Preview]  │  │                             ││
│ │ [Send (25)]         │  │                             ││
│ └─────────────────────┘  └─────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### **Buttons:**
```
[Cancel]  [👁️ Preview]  [Send (25)]
  Gray       Blue         Purple
```

- ✅ Cancel - Close modal
- ✅ Preview - Open full preview modal
- ✅ Send - Create & send campaign
- ✅ Contact count in button

---

## 📊 WORKFLOW

### **User Journey:**
```
1. Click "New Campaign"
2. Select bot
3. Enter campaign name
4. Write message with {{name}} and {{phone}}
5. (Optional) Upload image
6. Upload CSV file
   → Auto-parsed
   → Name detected from column
   → Table preview shown
7. See live preview (right panel)
   → First 3 contacts shown
   → Variables replaced
   → Image shown
8. Click "👁️ Preview" for full preview
   → All contacts shown
   → Exact messages shown
9. Click "Send (25)"
   → Campaign created
   → Messages queued
   → Sent one by one
```

---

## 🎯 EXAMPLE USAGE

### **CSV File (Excel format):**
```csv
name,phone
Ikhwan,62-857105569058
Aura,62-88716016402
```

### **Message Template:**
```
Halo {{name}}! 👋

Promo spesial untuk Anda:
✅ Diskon 50%
✅ Gratis ongkir

Hubungi kami di {{phone}} untuk info lebih lanjut!
```

### **Preview Output:**

**For Ikhwan:**
```
Halo Ikhwan! 👋

Promo spesial untuk Anda:
✅ Diskon 50%
✅ Gratis ongkir

Hubungi kami di 62857105569058 untuk info lebih lanjut!
```

**For Aura:**
```
Halo Aura! 👋

Promo spesial untuk Anda:
✅ Diskon 50%
✅ Gratis ongkir

Hubungi kami di 6288716016402 untuk info lebih lanjut!
```

---

## ✅ FEATURES SUMMARY

### **CSV Parsing:**
- ✅ Auto-detect column order (name,phone or phone,name)
- ✅ Skip header row automatically
- ✅ Clean phone numbers (remove spaces, dashes)
- ✅ Support phone-only format
- ✅ Show parsed data in table

### **Template Variables:**
- ✅ `{{name}}` replacement
- ✅ `{{phone}}` replacement
- ✅ Fallback to "Customer" if no name
- ✅ Case-insensitive matching

### **Message Preview:**
- ✅ Live preview (right panel)
- ✅ WhatsApp-style design
- ✅ Avatar with initial
- ✅ Image preview
- ✅ Variable replacement shown
- ✅ First 3 contacts
- ✅ Full preview modal (all contacts)
- ✅ Scrollable list
- ✅ Real-time updates

### **UX:**
- ✅ Two-column layout (form + preview)
- ✅ Sticky preview panel
- ✅ Preview button
- ✅ Contact count in send button
- ✅ Disabled states
- ✅ Loading states
- ✅ Error handling

---

## 📁 FILES MODIFIED

```
✅ frontend/src/app/dashboard/campaigns/page.tsx
   - Smart CSV parsing
   - Template variables
   - Live message preview
   - Full preview modal
   - Two-column layout
   - WhatsApp-style design
```

**Total:** 1 file, ~700 lines  
**Impact:** Campaign creation sekarang profesional dengan preview! ✅

---

## 🚀 READY TO USE!

**Fitur Lengkap:**
1. ✅ Smart CSV parsing (auto-detect format)
2. ✅ Template variables ({{name}}, {{phone}})
3. ✅ Live WhatsApp preview
4. ✅ Full preview modal
5. ✅ Image upload support
6. ✅ Contact table
7. ✅ Professional UI/UX

**Status:** 🎉 **CAMPAIGN SYSTEM COMPLETE!**

**Refresh browser untuk lihat perubahan!** 🚀
