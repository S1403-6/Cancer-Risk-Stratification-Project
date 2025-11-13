// src/controller/pathologistController.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const Patient = require('../models/patients');
const Report = require('../models/reports');

const OCR_API = process.env.OCR_API || "http://0.0.0.0:7000/ocr";
const RETRIEVER_API = process.env.RETRIEVER_API || "http://0.0.0.0:9000/analyze";

let uploadToStorage, ensurePatient, createReportForPatient;
try {
    ({ uploadToStorage } = require('../services/storageService'));
} catch {
    uploadToStorage = async (file) => `/uploads/${Date.now()}_${file.originalname}`;
}
try {
    ({ ensurePatient, createReportForPatient } = require('../services/reportService'));
} catch {
    ensurePatient = async (details) => ({ patient: { ...details, patientId: 'TEMP123', _id: 'dummy' }, existed: false });
    createReportForPatient = async (data) => ({ _id: 'REPORT123' });
}

const pathologistController = {
    uploadReport: async (req, res) => {
        try {
            console.log("[Controller] Upload request received.");
            const file = req.file;
            if (!file) return res.status(400).json({ message: 'No file uploaded' });

            // 1) Save file (S3 / local)
            const reportUrl = await uploadToStorage(file);
            console.log("[Controller] File stored at:", reportUrl);

            // 2) Call OCR
            const formData = new FormData();
            formData.append('file', file.buffer, file.originalname);

            console.log(`[Controller] Calling OCR at ${OCR_API}`);
            const ocrResponse = await axios.post(OCR_API, formData, {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
                timeout: 60000
            });

            const ocrText = ocrResponse.data.extracted_text || '';
            console.log("[Controller] OCR extracted chars:", ocrText.length);

            // 3) Extract patient info (stub)
            const patientDetails = extractPatientDetails(ocrText);

            // 4) Ensure patient exists
            const { patient, existed } = await ensurePatient(patientDetails);
            if (existed) {
                return res.status(200).json({ message: 'Patient already exists', patientId: patient.patientId });
            }

            // 5) Call retriever for risk analysis (if OCR didn't already forward)
            let llmResult = { report: 'Not available', score: 0.0 };
            if (ocrResponse.data.retriever_response) {
                // OCR forwarded to retriever; use that response
                const rr = ocrResponse.data.retriever_response;
                llmResult.report = rr.answer || llmResult.report;
                llmResult.score = rr.score || llmResult.score;
                console.log("[Controller] Using retriever response forwarded by OCR.");
            } else {
                console.log(`[Controller] Calling retriever at ${RETRIEVER_API}`);
                const retrResp = await axios.post(RETRIEVER_API, { text: ocrText }, { timeout: 60000 });
                llmResult.report = retrResp.data.answer || llmResult.report;
                llmResult.score = retrResp.data.score || llmResult.score;
                console.log("[Controller] Retriever responded. score=", llmResult.score);
            }

            // 6) Save report in MongoDB
            const reportDoc = await createReportForPatient({
                patient,
                uploadedBy: req.user ? req.user._id : 'system',
                originalReportUrl: reportUrl,
                ocrText,
                llmGeneratedReport: llmResult.report,
                normalizedScore: llmResult.score,
                status: 'Completed'
            });

            console.log("[Controller] Report created with id:", reportDoc._id);
            return res.status(201).json({ message: 'Report uploaded and analyzed successfully.', reportId: reportDoc._id, score: llmResult.score });

        } catch (error) {
            console.error("[Controller] Upload error:", error && error.response ? error.response.data || error.response.statusText : error.message || error);
            return res.status(500).json({ message: 'Error processing report', error: error.message || error });
        }
    },

    confirmUpload: async (req, res) => {
        try {
            const { patientId, reportData } = req.body;
            const patient = await Patient.findOne({ patientId });
            if (!patient) return res.status(404).json({ message: 'Patient not found' });

            const report = await createReportForPatient({
                patient,
                uploadedBy: req.user ? req.user._id : 'system',
                originalReportUrl: reportData.reportUrl,
                ocrText: reportData.ocrText,
                llmGeneratedReport: reportData.llmReport,
                normalizedScore: reportData.score,
                status: 'Completed'
            });
            return res.status(200).json({ message: 'Updated report submitted successfully.', reportId: report._id });
        } catch (error) {
            console.error("[Controller] Confirm upload error:", error);
            return res.status(500).json({ message: 'Error confirming report upload', error: error.message });
        }
    },

    testOCR: async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
            const formData = new FormData();
            formData.append('file', req.file.buffer, req.file.originalname);
            const ocrResponse = await axios.post(OCR_API, formData, { headers: formData.getHeaders() });
            const extractedText = ocrResponse.data.extracted_text || '';
            const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
            return res.status(200).json({ message: 'OCR extraction successful.', wordCount, extractedText });
        } catch (error) {
            console.error("[Controller] OCR test error:", error && error.response ? error.response.data : error.message);
            return res.status(500).json({ message: 'OCR failed', error: error.message || error });
        }
    }
};

function extractPatientDetails(ocrText) {
    // Extract Name, Gender, and Date of Birth using regex
    const nameMatch = ocrText.match(/Name:\s*([A-Za-z\s]+)/i);
    const genderMatch = ocrText.match(/Gender:\s*(Male|Female|Other|M|F)/i);
    const dobMatch = ocrText.match(/(?:DOB|Date of Birth):\s*([0-9]{2}[-/][0-9]{2}[-/][0-9]{2,4})/i);

    // Return parsed fields or defaults if not found
    return {
        patientId: 'PAT_' + Date.now(),
        name: nameMatch ? nameMatch[1].trim() : 'Unknown',
        gender: genderMatch ? genderMatch[1].replace(/M/i, 'Male').replace(/F/i, 'Female') : 'Unknown',
        dateOfBirth: dobMatch ? new Date(dobMatch[1]) : null
    };
}

module.exports = pathologistController;
