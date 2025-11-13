const Patient = require('../models/patients');
const Report = require('../models/reports');

/**
 * Report persistence service
 *
 * Responsibilities:
 * - Ensure a Patient exists (by patientId) and create if missing
 * - Create a Report linked to the patient and uploader
 * - Maintain the Patient.reports reference list
 */

/**
 * Ensure a patient exists for the given details.
 * If a Patient with the same `patientId` exists, returns it with existed=true.
 * Otherwise creates a new Patient and returns it with existed=false.
 *
 * @param {Object} details - { patientId, name, dateOfBirth, gender }
 * @returns {Promise<{patient: import('mongoose').Document, existed: boolean}>}
 */
async function ensurePatient(details) {
  if (!details || !details.patientId) {
    throw new Error('ensurePatient: patientId is required');
  }

  // Try to find existing patient by stable external ID
  let patient = await Patient.findOne({ patientId: details.patientId });
  if (patient) {
    return { patient, existed: true };
  }

  // Create new patient entry
  patient = await Patient.create({
    patientId: details.patientId,
    name: details.name || 'Unknown',
    dateOfBirth: details.dateOfBirth || undefined,
    gender: details.gender || undefined
  });

  return { patient, existed: false };
}

/**
 * Create a report for a given patient document (or patient id) and uploader.
 * Also appends the report id to the patient's `reports` array.
 *
 * @param {Object} opts
 * @param {string|import('mongoose').Document} opts.patient - Patient doc or patient ObjectId/string
 * @param {string|import('mongoose').Document} opts.uploadedBy - Uploader (User) id or doc
 * @param {string} opts.originalReportUrl - File path or public URL to original report
 * @param {string} [opts.ocrText]
 * @param {string} [opts.llmGeneratedReport]
 * @param {number} [opts.normalizedScore]
 * @param {string} [opts.status]
 * @returns {Promise<import('mongoose').Document>} The created Report document
 */
async function createReportForPatient(opts) {
  const {
    patient,
    uploadedBy,
    originalReportUrl,
    ocrText,
    llmGeneratedReport,
    normalizedScore,
    status = 'In Progress'
  } = opts || {};

  if (!patient) throw new Error('createReportForPatient: patient is required');
  if (!uploadedBy) throw new Error('createReportForPatient: uploadedBy is required');
  if (!originalReportUrl) throw new Error('createReportForPatient: originalReportUrl is required');

  // Normalize ids if documents were provided
  const patientId = typeof patient === 'object' && patient._id ? patient._id : patient;
  const uploaderId = typeof uploadedBy === 'object' && uploadedBy._id ? uploadedBy._id : uploadedBy;

  // Create report record
  const report = await Report.create({
    patient: patientId,
    uploadedBy: uploaderId,
    originalReportUrl,
    ocrText,
    llmGeneratedReport,
    normalizedScore,
    status
  });

  // Attach report to patient document
  await Patient.findByIdAndUpdate(patientId, { $push: { reports: report._id } });

  return report;
}

module.exports = {
  ensurePatient,
  createReportForPatient
};