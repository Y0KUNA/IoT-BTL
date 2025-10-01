// backend.js
import express from "express";
import mqtt from "mqtt";
import cors from "cors";
import bodyParser from "body-parser";
import sql from "mssql";

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// 🔧 Cấu hình kết nối SQL Server
const dbConfig = {
  user: "sa",
  password: "12345678",
  server: "DESKTOP-O8I245R\\HOTEL",
  database: "iot_system",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// ✅ Tạo pool kết nối
let pool;
(async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log("✅ Connected to SQL Server");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();

// Kết nối MQTT Broker
const brokerUrl = "mqtt://localhost:1883";
const client = mqtt.connect(brokerUrl, {
  username: "huy",
  password: "123",
});

// Bộ nhớ tạm
let sensorData = {
  temperature: null,
  humidity: null,
  light: null,
  lastUpdate: null,
};

let ledState = {
  led1: "OFF",
  led2: "OFF",
  led3: "OFF",
};

client.on("connect", () => {
  console.log("✅ Kết nối MQTT Broker thành công!");
  client.subscribe("iot/sensor/data");
});

// Nhận dữ liệu cảm biến từ ESP
client.on("message", async (topic, message) => {
  if (topic === "iot/sensor/data") {
    try {
      const data = JSON.parse(message.toString());
      sensorData.temperature = data.temperature;
      sensorData.humidity = data.humidity;
      sensorData.light = data.light;
      sensorData.lastUpdate = new Date().toISOString();

      console.log("📥 Dữ liệu nhận:", sensorData);

      // Lưu DB
      if (pool?.connected) {
        try {
          await pool
            .request()
            .input("temperature", sql.Float, data.temperature)
            .input("humidity", sql.Float, data.humidity)
            .input("light", sql.Int, data.light)
            .query(
              `INSERT INTO sensor_data (temperature, humidity, light)
               VALUES (@temperature, @humidity, @light)`
            );
          console.log("✅ Đã lưu dữ liệu cảm biến vào DB");
        } catch (dbErr) {
          console.error("❌ Lỗi khi insert sensor_data:", dbErr.message);
        }
      }
    } catch (err) {
      console.error("❌ Lỗi parse JSON:", err.message);
    }
  }
});

// API - Lấy dữ liệu cảm biến mới nhất
app.get("/api/sensors", async (req, res) => {
  try {
    if (pool?.connected) {
      const result = await pool.request().query(`
        SELECT TOP 1 * FROM sensor_data ORDER BY id DESC
      `);
      if (result.recordset.length > 0) {
        return res.json(result.recordset[0]);
      }
    }
    res.json(sensorData); // fallback
  } catch (err) {
    console.error("❌ Lỗi truy vấn sensor_data:", err.message);
    res.status(500).json({ error: "DB query error" });
  }
});

// ✅ API - Lấy lịch sử dữ liệu cảm biến có sắp xếp
// ✅ API - Lấy lịch sử dữ liệu cảm biến có sắp xếp & tìm kiếm
app.get("/api/sensors/history", async (req, res) => {
  try {
    if (!pool?.connected) {
      return res.status(500).json({ error: "DB not connected" });
    }

    let sortField = req.query.sortField || "id";
    let order = req.query.order || "desc";
    let searchField = req.query.searchField || "all";
    let searchQuery = req.query.searchQuery || "";

    // kiểm tra field hợp lệ
    const allowedFields = ["id", "temperature", "humidity", "light", "timestamp"];
    if (!allowedFields.includes(sortField)) sortField = "id";
    if (!["asc", "desc"].includes(order.toLowerCase())) order = "desc";

    // cột timestamp
    const column = sortField === "timestamp" ? "timestamp" : sortField;

    // xây WHERE
    let where = "";
    if (searchQuery) {
      const q = `%${searchQuery}%`;
      if (searchField !== "all" && allowedFields.includes(searchField)) {
        where = `WHERE CAST(${searchField} AS NVARCHAR) LIKE @q`;
      } else {
        // tìm trong tất cả các cột
        where = `
          WHERE 
            CAST(id AS NVARCHAR) LIKE @q OR
            CAST(temperature AS NVARCHAR) LIKE @q OR
            CAST(humidity AS NVARCHAR) LIKE @q OR
            CAST(light AS NVARCHAR) LIKE @q OR
            CAST(timestamp AS NVARCHAR) LIKE @q
        `;
      }
    }

    const sqlQuery = `
      SELECT * FROM sensor_data 
      ${where}
      ORDER BY ${column} ${order.toUpperCase()}
    `;

    const result = await pool.request()
      .input("q", sql.NVarChar, `%${searchQuery}%`)
      .query(sqlQuery);

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Lỗi lấy lịch sử sensor_data:", err.message);
    res.status(500).json({ error: "DB query error" });
  }
});


// API - Lấy trạng thái LED hiện tại
app.get("/api/led", (req, res) => {
  res.json(ledState);
});

// API - Điều khiển LED
app.post("/api/led", async (req, res) => {
  const { led1, led2, led3 } = req.body;
  if (
    !["ON", "OFF"].includes(led1) ||
    !["ON", "OFF"].includes(led2) ||
    !["ON", "OFF"].includes(led3)
  ) {
    return res.status(400).json({ error: "Sai tham số! Chỉ dùng ON hoặc OFF." });
  }
  ledState = { led1, led2, led3 };
  client.publish("iot/led/control", JSON.stringify(ledState));

  // Lưu DB
  if (pool?.connected) {
    try {
      await pool
        .request()
        .input("led1", sql.Bit, led1 === "ON" ? 1 : 0)
        .input("led2", sql.Bit, led2 === "ON" ? 1 : 0)
        .input("led3", sql.Bit, led3 === "ON" ? 1 : 0)
        .input("source", sql.VarChar, "API")
        .query(
          `INSERT INTO device_log (led1, led2, led3, source)
           VALUES (@led1, @led2, @led3, @source)`
        );
      console.log("✅ Đã lưu device_log vào DB");
    } catch (dbErr) {
      console.error("❌ Lỗi khi insert device_log:", dbErr.message);
    }
  }
  res.json({ message: "Đã gửi lệnh điều khiển LED", ledState });
});

// API - Lịch sử LED
app.get("/api/led/history", async (req, res) => {
  try {
    if (!pool?.connected) {
      return res.status(500).json({ error: "DB not connected" });
    }

    const result = await pool.request().query(`
      SELECT TOP 100 
        id,
        led1,
        led2,
        led3,
        source,
        FORMAT(timestamp, 'yyyy-MM-dd HH:mm:ss') AS timestamp
      FROM device_log
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Lỗi lấy device_log:", err.message);
    res.status(500).json({ error: "DB query error" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend chạy tại http://localhost:${PORT}`);
});
