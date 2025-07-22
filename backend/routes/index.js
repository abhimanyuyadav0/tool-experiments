// dummyfile.router.js
const path   = require("path");
const fs     = require("fs");
const ExcelJS = require("exceljs");
const { faker } = require("@faker-js/faker");
const express = require("express");

const dummyfileRouter = express.Router();   // ① create the router

dummyfileRouter.get("/generate/dummyfile", async (req, res) => {
  try {
    const targetBytes = 1_073_741_824;            // 1 GB
    const outputDir   = path.join(__dirname, "generated");
    const outputPath  = path.join(outputDir, "dummy_users.xlsx");

    fs.mkdirSync(outputDir, { recursive: true });

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: outputPath,
      useSharedStrings: false,
      useStyles: false,
    });

    const sheet = workbook.addWorksheet("Users");
    const HEADERS = [
      "id", "firstName", "lastName", "email", "phone",
      "address", "city", "state", "zipcode", "company", "jobTitle",
    ];
    sheet.addRow(HEADERS).commit();

    let bytes  = 0;
    let rows   = 0;
    const BATCH = 10_000;

    while (bytes < targetBytes) {
      for (let i = 0; i < BATCH; i++) {
        rows++;
        sheet.addRow([
          rows,
          faker.person.firstName(),
          faker.person.lastName(),
          faker.internet.email(),
          faker.phone.number(),
          faker.location.streetAddress(),
          faker.location.city(),
          faker.location.state(),
          faker.location.zipCode(),
          faker.company.name(),
          faker.person.jobTitle(),
        ]).commit();
      }

      // let the stream flush so fs.statSync sees the growth
      await new Promise(r => setImmediate(r));
      if (fs.existsSync(outputPath)) {
        bytes = fs.statSync(outputPath).size;
        console.log(`📊 ${rows.toLocaleString()} rows – ${(bytes/1024/1024).toFixed(1)} MB`);
      }
    }

    await workbook.commit();
    res.json({ message: "✅ Dummy file generated", path: "/generated/dummy_users.xlsx" });
  } catch (err) {
    console.error("❌ Generation failed:", err);
    res.status(500).json({ error: "Failed to generate file" });
  }
});
/* ------------------------------------------------------------------------- */
/*  NEW: /generate/dummycsv – ≈1 GB CSV with Faker user data                 */
/* ------------------------------------------------------------------------- */
// dummyfileRouter.get("/generate/dummycsv", async (req, res) => {
//   try {
//     const targetBytes = 1_073_741_824; // 1 GB
//     const outputDir = path.join(__dirname, "generated");
//     const outputPath = path.join(outputDir, "dummy_users.csv");

//     fs.mkdirSync(outputDir, { recursive: true });

//     const header = "id,firstName,lastName,email,phone,address,city,state,zipcode,company,jobTitle\n";
//     const stream = fs.createWriteStream(outputPath);
//     stream.write(header);

//     let bytes = Buffer.byteLength(header);
//     let rows = 0;
//     const BATCH = 25_000;

//     const makeLine = () =>
//       `${++rows},${faker.person.firstName()},${faker.person.lastName()},` +
//       `${faker.internet.email()},${faker.phone.number()},` +
//       `"${faker.location.streetAddress()}",${faker.location.city()},` +
//       `${faker.location.state()},${faker.location.zipCode()},` +
//       `"${faker.company.name()}",${faker.person.jobTitle()}\n`;

//     function writeBatch() {
//       let ok = true;
//       while (ok && bytes < targetBytes) {
//         for (let i = 0; i < BATCH; i++) {
//           const line = makeLine();
//           bytes += Buffer.byteLength(line);
//           ok = stream.write(line);
//         }

//         // Log progress every batch
//         console.log(`📊 Progress: ${rows.toLocaleString()} rows written, ${(bytes / 1024 / 1024).toFixed(1)} MB`);

//         if (!ok) break;
//       }

//       if (bytes < targetBytes) {
//         stream.once("drain", writeBatch);
//       } else {
//         stream.end();
//       }
//     }

//     stream.on("finish", () => {
//       console.log("✅ Dummy CSV file created successfully.");
//       res.json({
//         message: "✅ Dummy CSV generated",
//         path: "/generated/dummy_users.csv",
//         rowsGenerated: rows,
//         sizeInMB: (bytes / 1024 / 1024).toFixed(1),
//       });
//     });

//     writeBatch();
//   } catch (err) {
//     console.error("❌ CSV generation failed:", err);
//     res.status(500).json({ error: "Failed to generate CSV file" });
//   }
// });
dummyfileRouter.get("/generate/dummycsv", async (req, res) => {
  try {
    const targetBytes = 50 * 1024 * 1024 * 1024; // 50 GB
    const outputDir = path.join(__dirname, "generated");
    const outputPath = path.join(outputDir, "dummy_users.csv");

    fs.mkdirSync(outputDir, { recursive: true });

    const header = "id,firstName,lastName,email,phone,address,city,state,zipcode,company,jobTitle\n";
    const stream = fs.createWriteStream(outputPath);
    stream.write(header);

    let bytes = Buffer.byteLength(header);
    let rows = 0;
    const BATCH = 25_000;

    const makeLine = () =>
      `${++rows},${faker.person.firstName()},${faker.person.lastName()},` +
      `${faker.internet.email()},${faker.phone.number()},` +
      `"${faker.location.streetAddress()}",${faker.location.city()},` +
      `${faker.location.state()},${faker.location.zipCode()},` +
      `"${faker.company.name()}",${faker.person.jobTitle()}\n`;

    const startTime = Date.now();

    function writeBatch() {
      let ok = true;
      while (ok && bytes < targetBytes) {
        for (let i = 0; i < BATCH; i++) {
          const line = makeLine();
          bytes += Buffer.byteLength(line);
          ok = stream.write(line);
        }

        // Log progress every batch
        const mb = (bytes / 1024 / 1024).toFixed(1);
        const percent = ((bytes / targetBytes) * 100).toFixed(2);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`📊 ${rows.toLocaleString()} rows — ${mb} MB written (${percent}%) — ${elapsed}s elapsed`);

        if (!ok) break;
      }

      if (bytes < targetBytes) {
        stream.once("drain", writeBatch);
      } else {
        stream.end();
      }
    }

    stream.on("finish", () => {
      const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Dummy CSV file (50 GB) created.`);
      console.log(`🕒 Time taken: ${totalSeconds} seconds`);

      res.json({
        message: "✅ Dummy CSV generated",
        path: "/generated/dummy_users.csv",
        rowsGenerated: rows,
        sizeInGB: (bytes / 1024 / 1024 / 1024).toFixed(2),
        timeInSeconds: totalSeconds,
      });
    });

    writeBatch();
  } catch (err) {
    console.error("❌ CSV generation failed:", err);
    res.status(500).json({ error: "Failed to generate CSV file" });
  }
});


module.exports = dummyfileRouter;           // ② export the router
