const Report = require('../models/reports');
const Patient = require('../models/patients');

const doctorController = {
    // Fetch all reports (sorted by severity)
    getAllReports: async (req, res) => {
        try {
            const reports = await Report.find()
                .populate('patient', 'name')
                .sort({ normalizedScore: -1 })
                .select('patient normalizedScore llmGeneratedReport status doctorVerification');

            const formattedReports = reports.map(report => ({
                reportId: report._id,
                patientName: report.patient ? report.patient.name : 'Unknown',
                score: report.normalizedScore || 0,
                llmReport: report.llmGeneratedReport || 'N/A',
                status: report.status,
                isReviewed: report.doctorVerification?.isVerified || false,
                doctorScore: report.doctorVerification?.doctorScore || null,
                doctorComments: report.doctorVerification?.doctorComments || ''
            }));

            res.json(formattedReports);
        } catch (error) {
            console.error('Get reports error:', error);
            res.status(500).json({ message: 'Error fetching reports' });
        }
    },

    // Fetch a single report by ID
    getReportById: async (req, res) => {
        try {
            const report = await Report.findById(req.params.reportId)
                .populate('patient', 'name gender dateOfBirth')
                .populate('uploadedBy', 'username');

            if (!report) return res.status(404).json({ message: 'Report not found' });

            res.json(report);
        } catch (error) {
            console.error('Get report error:', error);
            res.status(500).json({ message: 'Error fetching report' });
        }
    },

    // Doctor verification
    verifyReport: async (req, res) => {
        try {
            const { doctorComments, doctorScore } = req.body;
            const report = await Report.findById(req.params.reportId);

            if (!report) return res.status(404).json({ message: 'Report not found' });

            report.doctorVerification = {
                isVerified: true,
                verifiedBy: req.user?._id || null,
                doctorComments,
                doctorScore,
                verificationDate: new Date()
            };
            report.status = 'Completed';

            await report.save();

            res.json({ message: 'Report verified successfully' });
        } catch (error) {
            console.error('Verify report error:', error);
            res.status(500).json({ message: 'Error verifying report' });
        }
    }
};

module.exports = doctorController;
