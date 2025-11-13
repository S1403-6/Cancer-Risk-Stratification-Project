const express = require('express');
const router = express.Router();
const pathologistController = require('../controller/pathologistController'); // ✅ fixed path (controllers)
const { authenticateToken, isPathologist } = require('../middleware/auth');
const multer = require('multer');

// Configure multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(isPathologist);

// ✅ POST /api/pathologist/upload - Upload new report
router.post('/upload', upload.single('report'), pathologistController.uploadReport);

// ✅ POST /api/pathologist/upload/confirm - Confirm upload for existing patient
router.post('/upload/confirm', pathologistController.confirmUpload);

// ✅ POST /api/pathologist/ocr - Perform OCR test
router.post('/ocr', upload.single('file'), pathologistController.testOCR);

module.exports = router;
