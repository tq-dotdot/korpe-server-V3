const router = require("express").Router();
const Pillow = require("../Models/Pillow");
const authorization = require("../Middlewares/Authenticaiton");

router.get("/", async (req, res) => {
  try {
    const items = await Pillow.find({ quantity: { $gt: 0 } }) 
      .sort({ createdAt: -1 })
      .populate("material", "name")
      .populate("item", "name");

    res.json(items);
  } catch (err) {
    console.log(err);
    res.status(409).send(err.message);
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      id,
      name,
      price,
      length,
      weight,
      quantity,
      selectedMaterial,
      selectedItem,
    } = req.body;

    // Build data object
    const data = {
      name,
      price,
      length,
      weight,
      quantity,
      material: selectedMaterial?._id,
      item: selectedItem?._id,
    };

    let pillow;

    if (id) {
      // Update existing pillow
      pillow = await Pillow.findByIdAndUpdate(id, data, { new: true });
      if (!pillow) {
        return res.status(404).send("Pillow not found");
      }
    } else {
      // Create new pillow
      pillow = await Pillow.create(data);
    }

    await pillow.populate("material", "name");
    await pillow.populate("item", "name");

    res.status(201).json(pillow);
  } catch (err) {
    console.log(err);
    res.status(409).send(err.message);
  }
});

module.exports = router;
