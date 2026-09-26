import { prisma } from "@/lib/prisma";
import { CHANNELS, DEFAULT_CADENCE, type Channel, type CadenceStepLike } from "@/lib/outreach";

export type CadenceMap = Record<string, { repeatEvery: number; steps: CadenceStepLike[] }>;

// Seeds the cadence table with the defaults the first time it's read, then just reads it.
export async function loadCadence(): Promise<CadenceMap> {
  const count = await prisma.cadenceStep.count();
  if (count === 0) {
    for (const ch of CHANNELS) {
      const def = DEFAULT_CADENCE[ch as Channel];
      await prisma.cadenceStep.createMany({
        data: def.steps.map((s) => ({ channel: ch, ...s })),
        skipDuplicates: true,
      });
      await prisma.cadenceSetting.upsert({
        where: { channel: ch },
        update: {},
        create: { channel: ch, repeatEvery: def.repeatEvery },
      });
    }
  }
  const [steps, settings] = await Promise.all([
    prisma.cadenceStep.findMany({ orderBy: [{ channel: "asc" }, { position: "asc" }] }),
    prisma.cadenceSetting.findMany(),
  ]);
  const map: CadenceMap = {};
  for (const ch of CHANNELS) {
    map[ch] = {
      repeatEvery: settings.find((s) => s.channel === ch)?.repeatEvery ?? 30,
      steps: steps.filter((s) => s.channel === ch),
    };
  }
  return map;
}
