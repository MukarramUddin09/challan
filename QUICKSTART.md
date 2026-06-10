# 🚀 Quick Start Guide - GHMC Challan System

## What Was Fixed/Added?

### ✅ 1. PDF Generation Fixed
- Now has fallback to HTML if PDF fails
- Better error handling and messages
- Works with or without Chromium

### ✅ 2. Challan vs Fine
- New dropdown to select "Challan" or "Fine"
- PDF shows correct title automatically

### ✅ 3. Admin Can Add Violations
- Go to `/admin/violations`
- Click "+ Add Violation"
- Users will see these options in the form

### ✅ 4. Admin Can Add Divisions  
- Go to `/admin/divisions`
- Click "+ Add Division"
- Users can select from these divisions

### ✅ 5. CORS Fixed
- Already configured properly
- No action needed

---

## ⚡ Getting Started (5 Minutes)

### Step 1: Seed Database
```bash
cd backend
npm run seed
```
This adds default violations and divisions. *(Run once)*

### Step 2: Start Backend
```bash
npm run dev
# Server runs on http://localhost:5000
```

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Step 4: Test
- Login as admin
- Go to `/admin/violations` → Add new violation
- Go to `/admin/divisions` → Add new division  
- Go to `/challans/new` → Create Challan/Fine
- Generate PDF to test

---

## 📝 Common Tasks

### Add New Violation Type
1. Navigate to `/admin/violations`
2. Click "+ Add Violation"
3. Enter name (e.g., "Parking Violation")
4. Add optional description
5. Click "Add Violation"

### Add New Area Division
1. Navigate to `/admin/divisions`
2. Click "+ Add Division"
3. Enter division name (e.g., "Charminar")
4. Optionally add code (e.g., "CHM")
5. Click "Add Division"

### Create Challan or Fine
1. Click "New Challan" in sidebar
2. Select **Type**: Challan or Fine ← **NEW!**
3. Select division (now from database) ← **NEW!**
4. Select violations (now from database) ← **NEW!**
5. Fill other details
6. Generate PDF (now with fallback) ← **FIXED!**

### Deactivate Without Deleting
- Click the "Active/Inactive" button on any item
- Deactivated items won't appear in forms

---

## 🔧 Environment Setup

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/ghmc-challan
JWT_SECRET=your-secret-key
PORT=5000
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000
```

---

## 📊 What Changed Behind the Scenes

| Feature | Before | After |
|---------|--------|-------|
| **Violations** | Hardcoded (8 options) | Dynamic (admin-managed) |
| **Divisions** | Hardcoded (11 options) | Dynamic (admin-managed) |
| **Document Type** | Only Challan | Challan or Fine |
| **PDF Generation** | Puppeteer only | Puppeteer + HTML fallback |

---

## ⚠️ If Something Goes Wrong

### PDF not generating?
- Check if Chromium is installed
- Or just use HTML preview (works fine for printing)

### Divisions/Violations empty?
- Run: `npm run seed` (backend)
- Or add manually from admin panel

### CORS errors?
- Check `FRONTEND_URL` in backend `.env`
- Should match your frontend URL

---

## 📚 More Info

See **SETUP.md** for detailed documentation and troubleshooting.

---

**That's it! You're ready to go! 🎉**
