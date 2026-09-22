// One-off script: import a scraper CSV into Prospect rows. Run with:
//   node scripts/import-prospects.cjs "<path to csv>"
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) throw new Error("Usage: node scripts/import-prospects.cjs <csv path>");

  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => names.map((n) => header.indexOf(n)).find((i) => i !== -1) ?? -1;

  const titleCol = col("title", "businessname", "business name", "name");
  const phoneCol = col("phone");
  const emailsCol = col("emails", "email");
  const websiteCol = col("website");
  const categoryCol = col("category");
  const addressCol = col("address");
  const ratingCol = col("review_rating", "rating");
  const reviewCountCol = col("review_count", "reviewcount");

  const prisma = new PrismaClient();
  const dataRows = rows.slice(1).filter((r) => r[titleCol]?.trim());

  let created = 0;
  for (const row of dataRows) {
    const businessName = row[titleCol]?.trim();
    if (!businessName) continue;
    const rating = ratingCol !== -1 ? parseFloat(row[ratingCol]) : NaN;
    const reviewCount = reviewCountCol !== -1 ? parseInt(row[reviewCountCol], 10) : NaN;

    await prisma.prospect.create({
      data: {
        businessName,
        phone: phoneCol !== -1 ? row[phoneCol]?.trim() || null : null,
        emails: emailsCol !== -1 ? row[emailsCol]?.trim() || null : null,
        website: websiteCol !== -1 ? row[websiteCol]?.trim() || null : null,
        category: categoryCol !== -1 ? row[categoryCol]?.trim() || null : null,
        address: addressCol !== -1 ? row[addressCol]?.trim() || null : null,
        rating: Number.isFinite(rating) ? rating : null,
        reviewCount: Number.isFinite(reviewCount) ? reviewCount : null,
        source: "csv-import",
      },
    });
    created++;
  }

  console.log(`Imported ${created} prospects`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
