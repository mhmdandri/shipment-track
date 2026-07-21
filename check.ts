const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const monitors = await prisma.terminalMonitor.findMany({
    where: { port: "koja" }
  });
  console.log(monitors);
  await prisma.$disconnect();
}
check();
