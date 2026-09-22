// One-off: replace every prospect's checklist items with the new detailed template
// (src/lib/prospectChecklist.ts), since the checklist content changed after prospects
// were already seeded with the old short template.
const { PrismaClient } = require("@prisma/client");

const DEFAULT_PROSPECT_CHECKLIST = require("./prospect-checklist-data.cjs");

const prisma = new PrismaClient();

async function main() {
  const prospects = await prisma.prospect.findMany({ select: { id: true } });
  for (const p of prospects) {
    await prisma.prospectChecklistItem.deleteMany({ where: { prospectId: p.id } });
    await prisma.prospectChecklistItem.createMany({
      data: DEFAULT_PROSPECT_CHECKLIST.map((item, i) => ({
        prospectId: p.id,
        section: item.section,
        text: item.text,
        order: i,
      })),
    });
  }
  console.log(`Reseeded checklist for ${prospects.length} prospects.`);
}

main().finally(() => prisma.$disconnect());
