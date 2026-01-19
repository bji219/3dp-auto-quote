import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Seed materials
  const materials = [
    {
      name: 'PLA',
      costPerCm3: 0.04,
      density: 1.24,
      color: 'Various',
      available: true,
      description: 'Best for prototypes and general use. Easy to print, biodegradable.',
    },
    {
      name: 'ABS',
      costPerCm3: 0.05,
      density: 1.05,
      color: 'Various',
      available: true,
      description: 'Strong and heat-resistant. Good for functional parts.',
    },
    {
      name: 'PETG',
      costPerCm3: 0.06,
      density: 1.27,
      color: 'Various',
      available: true,
      description: 'Durable and chemical resistant. Good layer adhesion.',
    },
    {
      name: 'TPU',
      costPerCm3: 0.08,
      density: 1.21,
      color: 'Various',
      available: true,
      description: 'Flexible and elastic. Perfect for parts requiring flexibility.',
    },
    {
      name: 'Nylon',
      costPerCm3: 0.10,
      density: 1.14,
      color: 'Natural/Black',
      available: true,
      description: 'Very strong and durable. Excellent for mechanical parts.',
    },
    {
      name: 'Carbon Fiber',
      costPerCm3: 0.15,
      density: 1.30,
      color: 'Black',
      available: true,
      description: 'Extremely strong and lightweight. Ideal for high-performance parts.',
    },
    {
      name: 'Resin',
      costPerCm3: 0.12,
      density: 1.10,
      color: 'Various',
      available: true,
      description: 'Highest detail and smooth finish. Perfect for miniatures and jewelry.',
    },
  ];

  for (const material of materials) {
    await prisma.material.upsert({
      where: { name: material.name },
      update: material,
      create: material,
    });
  }

  console.log('Created materials:', materials.length);

  // Seed pricing rules
  const pricingRules = [
    {
      name: 'Volume Discount Tier 1',
      ruleType: 'volume_discount',
      parameters: JSON.stringify({
        minVolume: 100,
        discountPercent: 5,
      }),
      active: true,
    },
    {
      name: 'Volume Discount Tier 2',
      ruleType: 'volume_discount',
      parameters: JSON.stringify({
        minVolume: 500,
        discountPercent: 10,
      }),
      active: true,
    },
    {
      name: 'Volume Discount Tier 3',
      ruleType: 'volume_discount',
      parameters: JSON.stringify({
        minVolume: 1000,
        discountPercent: 15,
      }),
      active: true,
    },
    {
      name: 'Rush Order Multiplier',
      ruleType: 'rush_multiplier',
      parameters: JSON.stringify({
        multiplier: 1.5,
        flatFee: 25,
      }),
      active: true,
    },
    {
      name: 'Quality Multiplier - Draft',
      ruleType: 'quality_multiplier',
      parameters: JSON.stringify({
        quality: 'draft',
        multiplier: 0.8,
      }),
      active: true,
    },
    {
      name: 'Quality Multiplier - Standard',
      ruleType: 'quality_multiplier',
      parameters: JSON.stringify({
        quality: 'standard',
        multiplier: 1.0,
      }),
      active: true,
    },
    {
      name: 'Quality Multiplier - High',
      ruleType: 'quality_multiplier',
      parameters: JSON.stringify({
        quality: 'high',
        multiplier: 1.3,
      }),
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

  console.log('Created pricing rules:', pricingRules.length);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
