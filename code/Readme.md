# Cancer Risk Stratification System

A comprehensive system for analyzing pathology reports using OCR (Optical Character Recognition) and LLM (Large Language Models) to stratify cancer risk. Built with Node.js/Express backend and React frontend.

## Overview

The Cancer Risk Stratification System enables:

1. **Pathologists** to upload pathology reports (images or PDFs)
2. **Automated Processing** using OCR for text extraction and LLM for severity analysis
3. **Doctors** to review and verify the analysis with professional scores
4. **Secure Storage** of all reports and analysis results in MongoDB

##  Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  - Pathologist Upload Portal                               │
│  - Doctor Review Dashboard                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────────────────────────┐
│              Backend (Node.js/Express)                      │
│  - Report Upload & Storage                                 │
│  - OCR Processing (OCR.space API)                           │
│  - LLM Analysis (Local Implementation)                      │
│  - Doctor Verification                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│            Database & Storage Layer                         │
│  - MongoDB: Users, Patients, Reports                        │
│  - File System: Uploaded Reports                            │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
cancer_project/
├── code/
│   ├── backend/               # Node.js/Express server
│   │   ├── src/
│   │   │   ├── config/       # Database configuration
│   │   │   ├── controller/   # Request handlers
│   │   │   ├── middleware/   # Auth, validation
│   │   │   ├── models/       # MongoDB schemas
│   │   │   ├── routes/       # API endpoints
│   │   │   └── services/     # Business logic
│   │   ├── uploads/          # Uploaded report files
│   │   ├── .env              # Environment variables
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── frontend_app/         # React application
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── pages/        # Page components
│   │   │   ├── services/     # API clients
│   │   │   ├── context/      # React Context
│   │   │   └── App.js        # Main app component
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── README.md             # This file
```

## Quick Start

### Prerequisites

- Node.js v14+
- MongoDB v4.4+
- npm or yarn
- Git

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5001
MONGO_URI=mongodb://localhost:27017/cancer-risk-db
JWT_SECRET=your_secret_key_here
NODE_ENV=development
OCR_SPACE_API_KEY=your_ocr_api_key_here
EOF

# Start MongoDB (in another terminal)
mongod

# Start backend server
npm run dev
```

Backend will be available at: `http://localhost:5001`

### Frontend Setup

```bash
cd frontend_app

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will open at: `http://localhost:3000`

## Usage Guide

### For Pathologists

1. **Register/Login** as a pathologist
2. **Navigate to Upload** section
3. **Select a Report** (JPG, PNG, or PDF)
4. **Upload** - System will:
   - Save the file
   - Extract text using OCR
   - Analyze severity with LLM
   - Store results in database
5. **Receive Confirmation** with report ID

### For Doctors

1. **Register/Login** as a doctor
2. **View Reports** dashboard
3. **Review Analysis**:
   - Extracted OCR text
   - LLM severity score
   - Relevant findings
4. **Add Verification**:
   - Professional comments
   - Verification score
   - Submit for completion

## Data Flow

```
1. Pathologist Upload
   ↓
2. File Storage (./uploads/)
   ↓
3. OCR Processing
   ├─ Extract text from image
   ├─ Detect language
   └─ Return extracted text
   ↓
4. Patient Extraction
   ├─ Parse OCR text
   └─ Extract patient info
   ↓
5. Patient Ensure
   ├─ Check if patient exists
   └─ Create if necessary
   ↓
6. LLM Analysis
   ├─ Analyze severity
   ├─ Extract key findings
   └─ Generate score (0-1)
   ↓
7. Report Creation
   ├─ Create report record
   ├─ Link to patient
   └─ Link to uploader
   ↓
8. Doctor Review
   ├─ View report details
   ├─ Add verification
   └─ Mark as completed
   ↓
9. Final Storage
   └─ Report marked verified in DB
```

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-Based Access Control**: Different permissions for pathologist/doctor
- **Password Hashing**: bcryptjs with salt rounds
- **CORS Protection**: Enabled on backend
- **Input Validation**: File type and size checks
- **Environment Variables**: Sensitive data in .env

## 🗄️ Database Models

### User
```
- username (unique)
- password (hashed)
- role (admin/pathologist/doctor)
- timestamps
```

### Patient
```
- patientId (unique)
- name
- dateOfBirth
- gender
- reports (array of Report IDs)
- timestamps
```

### Report
```
- patient (reference to Patient)
- uploadedBy (reference to User)
- originalReportUrl (file path)
- ocrText (extracted text)
- llmGeneratedReport (analysis)
- normalizedScore (0-1)
- doctorVerification (object with comments/score)
- status (In Progress/Completed)
- timestamps
```

## Key Technologies

### Backend
- **Express.js**: Web server framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB ODM
- **JWT**: Authentication tokens
- **Multer**: File upload handling
- **bcryptjs**: Password hashing
- **OCR.space API**: OCR processing
- **Axios**: HTTP client

### Frontend
- **React 18**: UI library
- **React Router**: Client-side routing
- **Axios**: HTTP requests
- **Context API**: State management
- **CSS3**: Styling with gradients

## API Endpoints

See detailed API documentation in:
- [Backend README](./backend/README.md#api-endpoints)
- [Frontend README](./frontend_app/README.md#api-integration)

## 🧪 Testing

### Manual Testing

```bash
# Test report upload
curl -X POST http://localhost:5001/api/pathologist/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "report=@path/to/report.pdf"

# Get all reports
curl -X GET http://localhost:5001/api/doctor/reports \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Integration Testing

1. Start all services (MongoDB, backend, frontend)
2. Register pathologist account
3. Upload test report
4. Verify file was saved
5. Check MongoDB for report record
6. Register doctor account
7. View uploaded report
8. Add verification

## Performance Considerations

- **Database Indexes**: Optimized for common queries
- **File Storage**: Consider cloud storage for production
- **OCR Timeout**: 120 seconds for large files
- **LLM Scoring**: Local implementation for speed
- **Caching**: Can be added for frequently accessed data

## Troubleshooting

### MongoDB Connection Error
```bash
# Start MongoDB
mongod

# Check connection string in .env
MONGO_URI=mongodb://localhost:27017/cancer-risk-db
```

### OCR API Error
```
- Verify OCR_SPACE_API_KEY in .env
- Check file size (max 10MB)
- Supported formats: JPG, PNG, PDF
```

### CORS Issues
```
- Frontend on port 3000
- Backend on port 5001
- CORS already enabled in server.js
```

### JWT/Auth Issues
```
- Clear localStorage in browser
- Log in again
- Check JWT_SECRET matches between sessions
```

## Environment Variables

### Backend (.env)

```env
PORT=5001                              # Server port
MONGO_URI=mongodb://localhost:27017/...# MongoDB connection
JWT_SECRET=your_secret_key_here        # JWT signing key
NODE_ENV=development                   # dev/production
OCR_SPACE_API_KEY=your_key_here        # OCR.space API key
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5001/api
```

## Service Layer Architecture

The `reportService.js` provides centralized business logic:

```javascript
// Ensure patient exists or create
const { patient, existed } = await ensurePatient({
  patientId, name, dateOfBirth, gender
});

// Create report linked to patient
const report = await createReportForPatient({
  patient,
  uploadedBy,
  originalReportUrl,
  ocrText,
  llmGeneratedReport,
  normalizedScore
});
```

Benefits:
- Reduces code duplication in controllers
- Ensures consistent database operations
- Easy to extend with additional validation
- Maintains referential integrity

## Documentation

- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend_app/README.md)
- API endpoints documented with cURL examples
- Database schema diagrams included

## Future Enhancements

- [ ] Advanced LLM integration (GPT-4, Claude)
- [ ] Real-time notifications via WebSockets
- [ ] Cloud storage integration (AWS S3, Google Cloud)
- [ ] Advanced analytics dashboard
- [ ] Report export (PDF, CSV)
- [ ] Audit logging and compliance
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] CI/CD pipeline
- [ ] Containerization (Docker)

## License

ISC

## Contributors

- Development Team
- IIITH DFSI Course Project

## Support

For issues, questions, or contributions:
1. Create an issue on GitHub
2. Submit a pull request
3. Contact the development team

## Checklist for Deployment

- [ ] Set up MongoDB
- [ ] Create .env files
- [ ] Install dependencies
- [ ] Test backend endpoints
- [ ] Test frontend upload
- [ ] Verify OCR processing
- [ ] Check database records
- [ ] Test doctor verification
- [ ] Enable HTTPS for production
- [ ] Set up monitoring and logging
