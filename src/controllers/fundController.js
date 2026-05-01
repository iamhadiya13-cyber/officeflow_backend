import { fundService } from '../services/fundService.js';

export const fundController = {
  getTeamFundStatus: async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
      const status = await fundService.getTeamFundStatus(year);
      res.json({ success: true, data: status });
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  },

  collectFund: async (req, res) => {
    try {
      const { employeeId, type, year } = req.body;
      const adminId = req.user._id;
      const result = await fundService.collectFund({ employeeId, type, year, adminId });
      res.json({ success: true, data: result });
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  },

  revertFund: async (req, res) => {
    try {
      const { id } = req.body;
      const adminId = req.user._id;
      const result = await fundService.revertFund({ id, adminId });
      res.json({ success: true, data: result });
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
};
