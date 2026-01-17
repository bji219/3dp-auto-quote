import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed materials
  const materials = [
    {
      name: 'PLA',
      costPerCm3: 0.15,
      density: 1.24,
      color: 'Various',
      available: true,
      description: 'Biodegradable, easy to print, good for prototypes',
    },
    {
      name: 'ABS',
      costPerCm3: 0.18,
      density: 1.04,
      color: 'Various',
      available: true,
      description: 'Strong, heat resistant, suitable for functional parts',
    },
    {
      name: 'PETG',
      costPerCm3: 0.20,
      density: 1.27,
      color: 'Various',
      available: true,
      description: 'Durable, flexible, food-safe option',
    },
    {
      name: 'TPU',
      costPerCm3: 0.27,
      density: 1.21,
      color: 'Various',
      available: true,
      description: 'Flexible, rubber-like material',
    },
    {
      name: 'Nylon',
      costPerCm3: 0.30,
      density: 1.14,
      color: 'Natural',
      available: true,
      description: 'Very strong and durable',
    },
    {
      name: 'Carbon Fiber',
      costPerCm3: 0.52,
      density: 1.30,
      color: 'Black',
      available: true,
      description: 'Extremely strong and lightweight',
    },
    {
      name: 'Resin',
      costPerCm3: 0.37,
      density: 1.15,
      color: 'Various',
      available: true,
      description: 'High detail, smooth surface finish',
    },
  ];

  for (const material of materials) {
    await prisma.material.upsert({
      where: { name: material.name },
      update: material,
      create: material,
    });
  }

  console.log('Materials seeded');

  // Seed pricing rules
  const pricingRules = [
    {
      name: 'Volume Discount - Small',
      ruleType: 'volume_discount',
      parameters: {
        minVolume: 100,
        maxVolume: 200,
        discount: 0.05,
      },
      active: true,
    },
    {
      name: 'Volume Discount - Medium',
      ruleType: 'volume_discount',
      parameters: {
        minVolume: 200,
        maxVolume: 500,
        discount: 0.10,
      },
      active: true,
    },
    {
      name: 'Volume Discount - Large',
      ruleType: 'volume_discount',
      parameters: {
        minVolume: 500,
        maxVolume: 1000,
        discount: 0.15,
      },
      active: true,
    },
    {
      name: 'Volume Discount - Extra Large',
      ruleType: 'volume_discount',
      parameters: {
        minVolume: 1000,
        discount: 0.20,
      },
      active: true,
    },
  ];

  for (const rule of pricingRules) {
    await prisma.pricingRule.upsert({
      where: { name: rule.name },
      update: rule,
      create: rule,
    });
  }

  console.log('Pricing rules seeded');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
