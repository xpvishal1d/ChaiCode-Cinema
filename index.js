//  CREATE TABLE seats (
//      id SERIAL PRIMARY KEY,
//      name VARCHAR(255),
//      isbooked INT DEFAULT 0
//  );
// INSERT INTO seats (isbooked)
// SELECT 0 FROM generate_series(1, 20);

import express from "express";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import "dotenv/config";
import { verifyToken } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = process.env.PORT || 8080;

// Equivalent to mongoose connection
// Pool is nothing but group of connections
// If you pick one connection out of the pool and release it
// the pooler will keep that connection open for sometime to other clients to reuse
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // Required for Railway
});

const app = new express();
app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.use("/auth", authRoutes(pool));


//get all seats
app.get("/seats", async (req, res) => {
  const result = await pool.query("select * from seats"); // equivalent to Seats.find() in mongoose
  res.send(result.rows);
});

//book a seat give the seatId and your name

//                    ↓ verifyToken add kiya
app.put("/:id/:name", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const name = req.params.name;
    const userId = req.user.id; // ← JWT token se user ID lo
    // payment integration should be here
    // verify payment
    const conn = await pool.connect();
    // KEEP THE TRANSACTION AS SMALL AS POSSIBLE
    await conn.query("BEGIN");
    const sql = "SELECT * FROM seats where id = $1 and isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    if (result.rowCount === 0) {
      res.send({ error: "Seat already booked" });
      return;
    }
    //                                              ↓ booked_by add kiya
    const sqlU = "update seats set isbooked = 1, name = $2, booked_by = $3 where id = $1";
    const updateResult = await conn.query(sqlU, [id, name, userId]); // ← userId add kiya

    await conn.query("COMMIT");
    conn.release();
    res.send(updateResult);
  } catch (ex) {
    console.log(ex);
    res.send(500);
  }
});

app.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM seats WHERE booked_by = $1",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch your bookings." });
  }
});

app.listen(port, () => console.log("Server starting on port: " + port));
