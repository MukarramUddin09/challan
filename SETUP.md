# GHMC Challan System - Updates & Setup Guide

## 🎯 Recent Updates

### 1. **PDF Generation Fixed** ✅
- **Issue Resolved**: Puppeteer PDF generation with enhanced error handling
- **Features**:
  - Automatic fallback to HTML preview if PDF generation fails
  - Better error messages for troubleshooting
  - Supports environments with/without Chromium installed
  
**To Fix PDF Generation:**
```bash
# Option 1: Install Chromium (recommended)
# Linux:
sudo apt-get install chromium-browser

# Option 2: Set custom Chrome path
export CHROME_PATH=/path/to/chrome
```

### 2. **Challan vs Fine Distinction** ✅
- **New Feature**: Ability to create either "Challan" or "Fine" documents
- **Changes**:
  - Added `type` field to Challan model (Challan / Fine)
  - PDF automatically shows correct label ("CHALLAN NOTICE" or "FINE NOTICE")
  - Type selector in the form when creating new documents

### 3. **Dynamic Violation Types** ✅
- **Feature**: Admin can now add/edit/delete violation types
- **Changes**:
  - Violations stored in database (not hardcoded)
  - New Admin page: "Violation Types" (`/admin/violations`)
  - API Endpoints:
    - `GET /api/violations` - List active violations
    - `POST /api/admin/violations` - Add violation
    - `PATCH /api/admin/violations/:id` - Update violation
    - `DELETE /api/admin/violations/:id` - Delete violation

### 4. **Dynamic Area Divisions** ✅
- **Feature**: Admin can now add/edit/delete area divisions
- **Changes**:
  - Divisions stored in database (not hardcoded)
  - New Admin page: "Area Divisions" (`/admin/divisions`)
  - API Endpoints:
    - `GET /api/divisions` - List active divisions
    - `POST /api/admin/divisions` - Add division
    - `PATCH /api/admin/divisions/:id` - Update division
    - `DELETE /api/admin/divisions/:id` - Delete division

### 5. **CORS Configuration** ✅
- **Status**: Already configured and working
- **Configuration**: `server.js` with support for credentials
- **Environment Variable**: `FRONTEND_URL` (defaults to `http://localhost:5173`)

---

## 📋 Installation & Setup

### Backend Setup

1. **Install Dependencies**:
```bash
cd backend
npm install
```

2. **Create `.env` file**:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/ghmc-challan

# Authentication
JWT_SECRET=your-secret-key-here

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@ghmc.gov.in
```

3. **Seed Initial Data** (required):
```bash
npm run seed
```
This creates default violations and divisions in the database.

4. **Start Backend**:
```bash
npm run dev      # Development with auto-reload
npm start        # Production
```

### Frontend Setup

1. **Install Dependencies**:
```bash
cd frontend
npm install
```

2. **Create `.env.local` file**:
```env
VITE_API_URL=http://localhost:5000
```

3. **Start Frontend**:
```bash
npm run dev      # Development
npm run build    # Production build
```

---

## 🛠️ New Admin Features

### Manage Violation Types
**Path**: `/admin/violations`

Features:
- ➕ Add new violation type
- ✏️ Edit existing violations
- 🔄 Toggle active/inactive status
- 🗑️ Delete violations

### Manage Area Divisions
**Path**: `/admin/divisions`

Features:
- ➕ Add new area division
- ✏️ Edit division details (name, code, description)
- 🔄 Toggle active/inactive status
- 🗑️ Delete divisions

---

## 📝 Create Challan/Fine Form

**Path**: `/challans/new`

New features:
- **Type Selection**: Choose between "Challan" or "Fine"
- **Dynamic Divisions**: Fetched from database
- **Dynamic Violations**: Fetched from database
- **Same functionality**: Location, violator name, officer details, photo upload

---

## 🔧 API Endpoints Summary

### Public Endpoints
- `GET /api/violations` - Get all active violations
- `GET /api/divisions` - Get all active divisions
- `GET /api/health` - Health check

### Admin Endpoints (Protected)

**Violations**:
- `GET /api/admin/violations` - List all violations
- `POST /api/admin/violations` - Create new violation
- `PATCH /api/admin/violations/:id` - Update violation
- `DELETE /api/admin/violations/:id` - Delete violation

**Divisions**:
- `GET /api/admin/divisions` - List all divisions
- `POST /api/admin/divisions` - Create new division
- `PATCH /api/admin/divisions/:id` - Update division
- `DELETE /api/admin/divisions/:id` - Delete division

---

## 📊 Database Models

### Violation Schema
```javascript
{
  name: String (unique),
  description: String,
  isActive: Boolean,
  createdAt: Date
}
```

### Division Schema
```javascript
{
  name: String (unique),
  code: String,
  description: String,
  isActive: Boolean,
  createdAt: Date
}
```

### Challan Schema (Updated)
```javascript
{
  // ... existing fields
  type: String (enum: ['Challan', 'Fine'], default: 'Challan')
}
```

---

## 🐛 Troubleshooting

### PDF Generation Issues

**Problem**: "Failed to generate PDF: Error: Failed to launch"

**Solutions**:
1. Install Chromium:
   ```bash
   # Linux
   sudo apt-get install chromium-browser
   
   # macOS
   brew install chromium
   
   # Windows: Download from https://www.chromium.org/getting-involved/download-chromium
   ```

2. Set custom Chrome path:
   ```bash
   export CHROME_PATH=/path/to/chrome
   ```

3. Use HTML fallback (automatic if PDF fails)

### CORS Issues

**Problem**: "Access to XMLHttpRequest blocked by CORS"

**Solution**: Check environment variable in `.env`:
```env
FRONTEND_URL=http://localhost:5173  # Must match your frontend URL
```

### Divisions/Violations Not Showing

**Problem**: Dropdown is empty in form

**Solutions**:
1. Run seed script: `npm run seed`
2. Add data from admin panel: `/admin/violations` and `/admin/divisions`
3. Check MongoDB connection: `MONGODB_URI` in `.env`

---

## 🚀 Production Deployment

### Backend
1. Set environment variables for production
2. Install Chromium for PDF generation
3. Use production-grade database (e.g., MongoDB Atlas)
4. Set `FRONTEND_URL` to production domain
5. Use `npm start` (not `npm run dev`)

### Frontend
1. Build for production: `npm run build`
2. Deploy `dist/` folder to hosting
3. Update `VITE_API_URL` to production API URL

---

## 📄 File Changes Summary

### New Files Created
- `backend/models/Violation.js` - Violation type model
- `backend/models/Division.js` - Division model
- `backend/utils/pdfGenerator.js` - Enhanced PDF generation utility
- `backend/seed.js` - Database seed script
- `frontend/src/pages/AdminViolations.jsx` - Admin page for violations
- `frontend/src/pages/AdminDivisions.jsx` - Admin page for divisions

### Modified Files
- `backend/server.js` - Added new routes for violations/divisions
- `backend/routes/admin.js` - Added admin endpoints for violations/divisions
- `backend/routes/challans.js` - Updated PDF generation logic, added type field support
- `backend/models/Challan.js` - Added type field
- `backend/package.json` - Added seed script
- `frontend/src/pages/ChallanNew.jsx` - Fetch from API, added type selector
- `frontend/src/components/Layout.jsx` - Added new admin menu items
- `frontend/src/App.jsx` - Added routes for new admin pages

### Updated Templates
- `backend/utils/pdfTemplate.js` - Updated to show type (Challan/Fine)

---

## ✨ Next Steps

1. **Run seed script** to populate initial data:
   ```bash
   cd backend
   npm run seed
   ```

2. **Test features**:
   - Navigate to `/admin/violations` to add violation types
   - Navigate to `/admin/divisions` to add area divisions
   - Create new Challan/Fine at `/challans/new`
   - Generate PDF to test

3. **Customize** violations and divisions as per your requirements

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review error logs in console
3. Verify `.env` configuration
4. Ensure MongoDB is running and accessible

---

**Last Updated**: 2026-06-07
**Version**: 1.1.0
