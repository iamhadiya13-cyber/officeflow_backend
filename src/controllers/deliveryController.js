import DailyDelivery from '../models/DailyDelivery.js';
import DeliveryPrice from '../models/DeliveryPrice.js';

// Get daily deliveries for a specific month
export const getDeliveriesByMonth = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
    }

    const startDate = `${month}-01`;
    const endDate = `${month}-31`; // String comparison works for YYYY-MM-DD

    const deliveries = await DailyDelivery.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const price = await DeliveryPrice.findOne({ month });

    res.json({
      deliveries,
      price: price || { waterPrice: 0, teaPrice: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add or update daily delivery
export const updateDailyDelivery = async (req, res) => {
  try {
    const { date, waterUnits, teaUnits } = req.body;
    
    let delivery = await DailyDelivery.findOne({ date });
    if (delivery) {
      delivery.waterUnits = waterUnits;
      delivery.teaUnits = teaUnits;
      delivery.updatedBy = req.user._id;
      await delivery.save();
    } else {
      delivery = new DailyDelivery({
        date,
        waterUnits,
        teaUnits,
        updatedBy: req.user._id
      });
      await delivery.save();
    }
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete daily delivery
export const deleteDailyDelivery = async (req, res) => {
  try {
    const { date } = req.params;
    await DailyDelivery.findOneAndDelete({ date });
    res.json({ message: 'Delivery deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add or update month price
export const updateDeliveryPrice = async (req, res) => {
  try {
    const { month, waterPrice, teaPrice } = req.body;

    let price = await DeliveryPrice.findOne({ month });
    if (price) {
      price.waterPrice = waterPrice;
      price.teaPrice = teaPrice;
      price.updatedBy = req.user._id;
      await price.save();
    } else {
      price = new DeliveryPrice({
        month,
        waterPrice,
        teaPrice,
        updatedBy: req.user._id
      });
      await price.save();
    }

    res.json(price);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
