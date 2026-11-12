import {
  ACTIVE_PRINTER,
  INTERNAL_DEFAULTS,
  MATERIALS,
  MaterialId,
  PUBLIC_PRICING,
  PrinterProfile,
} from './config';
import { PrintEstimate } from './estimate';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PublicQuoteOptions {
  material: MaterialId;
  quantity?: number;
  rush?: boolean;
  shipping?: boolean;
  printer?: PrinterProfile;
}

export interface PublicQuote {
  quantity: number;
  /** One part, before quantity discount. */
  unitPrice: number;
  /** One part: plastic, machine time, handling, support removal. */
  unit: { material: number; machine: number; handling: number; supportRemoval: number };
  setupFee: number;
  partsTotal: number;
  discountPercent: number;
  discount: number;
  /** Top-up applied when setup + parts falls below the minimum order. */
  minimumAdjustment: number;
  rushFee: number;
  shipping: number;
  freeShipping: boolean;
  tax: number;
  total: number;
  /** Totals for the whole order, including the once-per-plate purge and warm-up. */
  totalGrams: number;
  totalHours: number;
}

/** Price an order of `quantity` identical parts from the public price list. */
export function pricePublic(est: PrintEstimate, opts: PublicQuoteOptions): PublicQuote {
  const P = PUBLIC_PRICING;
  const printer = opts.printer ?? ACTIVE_PRINTER;
  const mat = MATERIALS[opts.material] ?? MATERIALS.PLA;
  const quantity = Math.min(P.maxQuantity, Math.max(1, Math.floor(opts.quantity ?? 1)));

  const material = est.grams * mat.sellPerGram;
  const machine = est.hours * P.machineRatePerHour;
  const handling = P.handlingPerPart;
  const supportRemoval = est.needsSupport
    ? Math.max(P.supportRemoval.minimum, (material + machine) * P.supportRemoval.percent)
    : 0;
  const unitPrice = material + machine + handling + supportRemoval;

  const partsTotal = unitPrice * quantity;
  const tier = P.quantityDiscounts.find((t) => quantity >= t.minQty);
  const discountPercent = tier ? tier.percent : 0;
  // Crossing into a tier must never make the order cheaper than one part
  // fewer, so floor the discounted line at the price just below each tier.
  const net = (q: number): number => {
    const t = P.quantityDiscounts.find((x) => q >= x.minQty);
    if (!t) return unitPrice * q;
    return Math.max(unitPrice * q * (1 - t.percent / 100), net(t.minQty - 1));
  };
  const discount = partsTotal - net(quantity);

  const setupFee = P.setupFee;
  const beforeMinimum = setupFee + partsTotal - discount;
  const minimumAdjustment = Math.max(0, P.minimumOrder - beforeMinimum);
  const goods = beforeMinimum + minimumAdjustment;

  const rushFee = opts.rush ? Math.max(P.rush.minimum, goods * P.rush.percent) : 0;
  const wantsShipping = opts.shipping ?? true;
  const freeShipping = wantsShipping && goods + rushFee >= P.shipping.freeOver;
  const shipping = wantsShipping && !freeShipping ? P.shipping.flat : 0;
  const tax = (goods + rushFee + shipping) * P.taxRate;

  return {
    quantity,
    unitPrice: round2(unitPrice),
    unit: {
      material: round2(material),
      machine: round2(machine),
      handling: round2(handling),
      supportRemoval: round2(supportRemoval),
    },
    setupFee: round2(setupFee),
    partsTotal: round2(partsTotal),
    discountPercent,
    discount: round2(discount),
    minimumAdjustment: round2(minimumAdjustment),
    rushFee: round2(rushFee),
    shipping: round2(shipping),
    freeShipping,
    tax: round2(tax),
    total: round2(goods + rushFee + shipping + tax),
    totalGrams: est.grams * quantity + printer.startupGrams,
    totalHours: est.hours * quantity + printer.startupHours,
  };
}

/* ------------------------------------------------------------------ */
/* Internal job costing                                                */
/* ------------------------------------------------------------------ */

export interface JobInputs {
  /** Per part. From the STL estimate or typed in from your slicer. */
  gramsPerPart: number;
  hoursPerPart: number;
  quantity: number;
  /** $/kg you pay for this filament. */
  materialCostPerKg: number;
  machineCostPerHour: number;
  /** 0-1 */
  failureRate: number;
  /** CAD, drawings, test prints, client back-and-forth. Hours, whole job. */
  designHours: number;
  designRatePerHour: number;
  /** Slicing, plate prep, changeovers. Minutes, whole job. */
  setupMinutes: number;
  /** Support removal, sanding, inserts, assembly. Minutes per part. */
  postProcessMinutesPerPart: number;
  shopRatePerHour: number;
  /** Magnets, inserts, NFC tags, fasteners. $ per part. */
  hardwarePerPart: number;
  packagingPerOrder: number;
  shippingCost: number;
  /** 0-1 gross margin. */
  targetMargin: number;
  paymentFeePercent: number;
  paymentFeeFixed: number;
}

export interface JobCost {
  quantity: number;
  lines: {
    material: number;
    machine: number;
    scrap: number;
    design: number;
    setupLabor: number;
    postProcess: number;
    hardware: number;
    packaging: number;
    shipping: number;
  };
  /** What the job costs you, before card fees. */
  cost: number;
  /** Price that hits the target margin after card fees. */
  price: number;
  pricePerPart: number;
  paymentFee: number;
  profit: number;
  /** Realised margin at `price`. */
  margin: number;
  /** Spool and machine hours to block out, including scrap. */
  totalGrams: number;
  totalHours: number;
  /** Your effective hourly earnings: (labour charged + profit) / hands-on hours. */
  effectiveHourly: number;
}

export function defaultJobInputs(material: MaterialId = 'PLA'): JobInputs {
  const D = INTERNAL_DEFAULTS;
  return {
    gramsPerPart: 0,
    hoursPerPart: 0,
    quantity: 1,
    materialCostPerKg: MATERIALS[material].costPerKg,
    machineCostPerHour: D.machineCostPerHour,
    failureRate: D.failureRate,
    designHours: 0,
    designRatePerHour: D.designRatePerHour,
    setupMinutes: D.setupMinutesPerJob,
    postProcessMinutesPerPart: D.postProcessMinutesPerPart,
    shopRatePerHour: D.shopRatePerHour,
    hardwarePerPart: 0,
    packagingPerOrder: D.packagingPerOrder,
    shippingCost: 0,
    targetMargin: D.targetMargin,
    paymentFeePercent: D.paymentFee.percent,
    paymentFeeFixed: D.paymentFee.fixed,
  };
}

/** Cost a job from first principles and back out a price from a target margin. */
export function costJob(input: JobInputs, priceOverride?: number): JobCost {
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  const quantity = Math.max(1, Math.floor(n(input.quantity) || 1));
  const fail = Math.min(0.9, n(input.failureRate));

  const material = (n(input.gramsPerPart) / 1000) * n(input.materialCostPerKg) * quantity;
  const machine = n(input.hoursPerPart) * n(input.machineCostPerHour) * quantity;
  // Expected reprints to end up with `quantity` good parts.
  const scrap = (material + machine) * (fail / (1 - fail));
  const design = n(input.designHours) * n(input.designRatePerHour);
  const setupLabor = (n(input.setupMinutes) / 60) * n(input.shopRatePerHour);
  const postHours = (n(input.postProcessMinutesPerPart) / 60) * quantity;
  const postProcess = postHours * n(input.shopRatePerHour);
  const hardware = n(input.hardwarePerPart) * quantity;
  const packaging = n(input.packagingPerOrder);
  const shipping = n(input.shippingCost);

  const cost =
    material +
    machine +
    scrap +
    design +
    setupLabor +
    postProcess +
    hardware +
    packaging +
    shipping;

  const feePct = Math.min(0.5, n(input.paymentFeePercent));
  const feeFixed = n(input.paymentFeeFixed);
  const margin = Math.min(0.95, n(input.targetMargin));
  // price - fee(price) - cost = margin * price
  const solved = (cost + feeFixed) / Math.max(0.01, 1 - margin - feePct);
  const price = priceOverride !== undefined && priceOverride > 0 ? priceOverride : solved;
  const paymentFee = price * feePct + feeFixed;
  const profit = price - paymentFee - cost;

  const handsOn = n(input.designHours) + n(input.setupMinutes) / 60 + postHours;
  const labourCharged = design + setupLabor + postProcess;

  return {
    quantity,
    lines: {
      material: round2(material),
      machine: round2(machine),
      scrap: round2(scrap),
      design: round2(design),
      setupLabor: round2(setupLabor),
      postProcess: round2(postProcess),
      hardware: round2(hardware),
      packaging: round2(packaging),
      shipping: round2(shipping),
    },
    cost: round2(cost),
    price: round2(price),
    pricePerPart: round2(price / quantity),
    paymentFee: round2(paymentFee),
    profit: round2(profit),
    margin: price > 0 ? profit / price : 0,
    totalGrams: (n(input.gramsPerPart) * quantity) / (1 - fail),
    totalHours: (n(input.hoursPerPart) * quantity) / (1 - fail),
    effectiveHourly: handsOn > 0 ? (labourCharged + profit) / handsOn : 0,
  };
}
