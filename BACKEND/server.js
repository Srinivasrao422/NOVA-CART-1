import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import { Product } from "./models/Product.js";
import { seedProducts } from "./data/products.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

const PORT = Number(process.env.PORT || 5000);

/* =========================
   ✅ CORS FIX (IMPORTANT)
========================= */

const allowedOrigins = [
  "http://localhost:5173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")   // ✅ THIS LINE FIXES EVERYTHING
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

// Optional (helps preflight requests)
app.options("*", cors());

/* =========================
   MIDDLEWARE
========================= */

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("Nova Cart Backend Running 🚀");
});

app.get("/health", (req, res) =>
  res.json({ ok: true, name: "Nova Cart API" })
);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

/* =========================
   ERROR HANDLING
========================= */

app.use(notFound);
app.use(errorHandler);

/* =========================
   START SERVER (ONLY ONCE)
========================= */

async function start() {
  await connectDB(process.env.MONGO_URI);

  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(seedProducts);
    console.log(`Auto-seeded ${seedProducts.length} products`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nova Cart backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
