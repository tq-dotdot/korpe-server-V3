const router = require('express').Router();
const Sale = require('../Models/Sale');
const authorization = require('../Middlewares/Authenticaiton');
const Material = require('../Models/Material');
const Case = require('../Models/Case');
const Item = require('../Models/Item');
const Pillow = require('../Models/Pillow');

router.post('/', authorization, async (req, res) => {
  try {
    const { client, total, received, readyOrder } = req.body;
    // Ensure orders array exists and has at least one order
    if (
      client &&
      Array.isArray(req.body.orders) &&
      req.body.orders.length > 0
    ) {
      // Find or create a Sale document for the client

      let sale = await Sale.create({
        name: client,
        total: total,
        received: received,
        sales: [], // Initialize sales array if no sale document found
        readyOrder,
      });

      // Loop through orders and add them to the sales array
      for (const order of req.body.orders) {
        // Helper to decrement total safely
        const decrement = async (Model, id, amount) => {
          if (id && amount) {
            const doc = await Model.findById(id);
            if (doc && doc.total) {
              doc.total -= amount;
              await doc.save();
            }else{
              doc.quantity -= amount;
              await doc.save();
            }
          }
        };

        // 1️⃣ Handle pillow separately
        if (order.pillow) {
          await decrement(
            Material,
            order.pillow.material?._id,
            order.pillow.weight,
          );
          await decrement(Item, order.pillow.item?._id, order.pillow.length);
          // await decrement(Case, order.pillow.case?._id, order.pillow.quantity);
          await decrement(Pillow, order.pillow._id, order.quantity);
        }

        // 2️⃣ Add main order to sale.sales
        sale.sales.push({
          item: order.item?._id,
          service: order.service?._id,
          material: order.material?._id,
          case: order.case?._id,
          pillow: order.pillow?._id,
          weight: order.weight,
          length: order.length, // fixed typo
          quantity: order.quantity,
          alypName: order.alypName,
          alypWeight: order.alypWeight,
        });

        // 3️⃣ Decrement totals for main order
        // await decrement(Material, order.material?._id, order.weight);
        // await decrement(Item, order.item?._id, order.length);
      }

      await sale.save();

      return res.json({ message: 'Sale created/updated successfully', sale });
    } else {
      return res.status(400).json({
        message: 'Invalid request. Please provide valid orders and client.',
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong!' });
  }
});

router.post('/received', authorization, async (req, res) => {
  try {
    const { _id } = req.body;
    let sale = await Sale.findOne({ _id });
    if (sale) {
      sale.last_received = sale.total - sale.received;
      sale.received = sale.total;
      await sale.save();

      return res.json({ message: 'Sale updated successfully', sale });
    }
    return res.json({ message: "Couldn't update!", sale });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong!' });
  }
});

router.get('/', async (req, res) => {
  try {
    const items = await Sale.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: 'sales.item',
        select: 'name price',
      })
      .populate({
        path: 'sales.service',
        select: 'name price',
      })
      .populate({
        path: 'sales.material',
        select: 'name price',
      })
      .populate({
        path: 'sales.case',
        select: 'name price',
      })
      .populate({
        path: 'sales.pillow',
        select: 'name price',
      });
    res.json(items);
  } catch (err) {
    res.status(409).send(err.message);
  }
});

router.get('/debts', async (req, res) => {
  try {
    const items = await Sale.find({
      $expr: { $ne: ['$total', '$received'] }, // Filter: total != received
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'sales.item',
        select: 'name price',
      })
      .populate({
        path: 'sales.service',
        select: 'name price',
      })
      .populate({
        path: 'sales.material',
        select: 'name price',
      })
      .populate({
        path: 'sales.case',
        select: 'name price',
      });

    res.json(items);
  } catch (err) {
    res.status(409).send(err.message);
  }
});

router.delete('/', async (req, res) => {
  try {
    const { _id } = req.query;

    if (!_id) {
      return res.status(400).json({
        message: 'Invalid request. Please provide either _id or client name.',
      });
    }

    let sale;

    if (_id) {
      sale = await Sale.findByIdAndDelete(_id);
    }

    if (!sale) {
      return res.status(404).json({
        message: 'Sale not found.',
      });
    }

    return res.json({
      message: 'Sale deleted successfully.',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while deleting the sale.',
    });
  }
});

module.exports = router;
