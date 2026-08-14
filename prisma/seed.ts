import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

async function ensureDemoObjection() {
  const already = await prisma.meter.count({ where: { objectionStatus: "IN_OBJECTION" } });
  if (already > 0) return;
  const steel = await prisma.meter.findFirst({
    where: { mpan: "000080016600223344556" },
  });
  if (!steel) return;
  await prisma.meter.update({
    where: { id: steel.id },
    data: {
      objectionStatus: "IN_OBJECTION",
      objectionNote: "Debt on account — TotalEnergies raised 8 Aug 2026. Works manager chasing arrears.",
      objectionRaisedOn: daysFromNow(-6),
      objectionClearedOn: null,
    },
  });
}

async function main() {
  const existing = await prisma.agent.count();
  if (existing > 0) {
    await ensureDemoObjection();
    console.log("Desk already seeded — skipping (objection demo checked).");
    return;
  }

  const james = await prisma.agent.create({
    data: { name: "James Whitaker", email: "james.whitaker@nzce.co.uk", role: "Sales" },
  });
  const priya = await prisma.agent.create({
    data: { name: "Priya Shah", email: "priya.shah@nzce.co.uk", role: "Sales" },
  });
  const tom = await prisma.agent.create({
    data: { name: "Tom Brennan", email: "tom.brennan@nzce.co.uk", role: "Sales" },
  });
  const helen = await prisma.agent.create({
    data: { name: "Helen Crowe", email: "helen.crowe@nzce.co.uk", role: "Operations" },
  });

  const riverside = await prisma.customer.create({
    data: {
      companyName: "Riverside Care Group Ltd",
      tradingName: "Riverside Care",
      contactName: "Margaret Hale",
      email: "margaret.hale@riverside-care.co.uk",
      phone: "0161 555 0142",
      addressLine1: "18 Quay Street",
      city: "Manchester",
      postcode: "M3 4AE",
      industry: "Care homes",
    },
  });

  const oakfield = await prisma.customer.create({
    data: {
      companyName: "Oakfield Primary Academy",
      contactName: "David Okonkwo",
      email: "d.okonkwo@oakfield-academy.sch.uk",
      phone: "0113 555 2088",
      addressLine1: "Oakfield Lane",
      city: "Leeds",
      postcode: "LS6 2AB",
      industry: "Education",
    },
  });

  const harbour = await prisma.customer.create({
    data: {
      companyName: "Harbour View Hotels Ltd",
      tradingName: "Harbour View",
      contactName: "Claire Debenham",
      email: "claire.debenham@harbourviewhotels.co.uk",
      phone: "01273 555 441",
      addressLine1: "2 Marine Parade",
      city: "Brighton",
      postcode: "BN2 1TL",
      industry: "Hospitality",
    },
  });

  const bakery = await prisma.customer.create({
    data: {
      companyName: "Greenfield Artisan Bakery",
      contactName: "Samira Khan",
      email: "samira@greenfieldbakery.co.uk",
      phone: "0117 555 9033",
      addressLine1: "44 Stokes Croft",
      city: "Bristol",
      postcode: "BS1 3QD",
      industry: "Food manufacturing",
    },
  });

  const mersey = await prisma.customer.create({
    data: {
      companyName: "Mersey Logistics Ltd",
      contactName: "Paul McKenna",
      email: "paul.mckenna@merseylogistics.co.uk",
      phone: "0151 555 7760",
      addressLine1: "Unit 9, Speke Industrial Park",
      city: "Liverpool",
      postcode: "L24 8RJ",
      industry: "Warehousing & logistics",
    },
  });

  const parish = await prisma.customer.create({
    data: {
      companyName: "St Anne's Parish Hall",
      contactName: "Rev. Eleanor Briggs",
      email: "eleanor.briggs@stannes-york.org",
      phone: "01904 555 118",
      addressLine1: "12 Bootham",
      city: "York",
      postcode: "YO30 7BL",
      industry: "Charity / community",
    },
  });

  const steel = await prisma.customer.create({
    data: {
      companyName: "Northern Steel Fabrications",
      contactName: "Ian Croft",
      email: "ian.croft@nsfab.co.uk",
      phone: "0114 555 6621",
      addressLine1: "Attercliffe Road",
      city: "Sheffield",
      postcode: "S9 3RA",
      industry: "Manufacturing",
    },
  });

  const coastal = await prisma.customer.create({
    data: {
      companyName: "Coastal Leisure Parks Ltd",
      tradingName: "Atlantic Dunes",
      contactName: "Becky Trevelyan",
      email: "becky.trevelyan@coastalleisure.co.uk",
      phone: "01736 555 290",
      addressLine1: "Atlantic Dunes Holiday Park",
      city: "Hayle",
      postcode: "TR27 5AA",
      industry: "Leisure / holiday parks",
    },
  });

  const riversideM1 = await prisma.meter.create({
    data: {
      customerId: riverside.id,
      siteName: "Quay Street home",
      siteAddress: "18 Quay Street, Manchester M3 4AE",
      fuelType: "ELECTRIC",
      mpan: "008010011234567890123",
      electricEac: 186400,
      supplier: "E.ON Next",
      contractStart: daysFromNow(-400),
      contractEnd: daysFromNow(70),
      meterType: "Whole current",
      settlement: "NHH",
      currentRates: "Day 26.4p / Night 15.1p / SC £0.82",
      renewalDate: daysFromNow(70),
      loaStatus: "RECEIVED",
      salespersonId: james.id,
    },
  });
  const riversideM2 = await prisma.meter.create({
    data: {
      customerId: riverside.id,
      siteName: "Salford annex",
      siteAddress: "4 Irwell Place, Salford M5 4WT",
      fuelType: "ELECTRIC",
      mpan: "008010011234567890456",
      electricEac: 94200,
      supplier: "E.ON Next",
      contractStart: daysFromNow(-400),
      contractEnd: daysFromNow(70),
      meterType: "Smart",
      settlement: "NHH",
      currentRates: "Day 26.4p / SC £0.82",
      renewalDate: daysFromNow(70),
      loaStatus: "RECEIVED",
      salespersonId: james.id,
    },
  });
  await prisma.meter.create({
    data: {
      customerId: riverside.id,
      siteName: "Quay Street home",
      siteAddress: "18 Quay Street, Manchester M3 4AE",
      fuelType: "GAS",
      mprn: "1234567801",
      gasAq: 312000,
      supplier: "British Gas",
      contractStart: daysFromNow(-400),
      contractEnd: daysFromNow(70),
      meterType: "Traditional",
      currentRates: "Unit 6.8p / SC £0.31",
      renewalDate: daysFromNow(70),
      loaStatus: "RECEIVED",
      salespersonId: james.id,
    },
  });

  await prisma.meter.create({
    data: {
      customerId: oakfield.id,
      siteName: "Main school",
      siteAddress: "Oakfield Lane, Leeds LS6 2AB",
      fuelType: "ELECTRIC",
      mpan: "001590012200334455667",
      electricEac: 128000,
      supplier: "Octopus Energy",
      contractStart: daysFromNow(-280),
      contractEnd: daysFromNow(110),
      meterType: "Whole current",
      settlement: "NHH",
      currentRates: "Day 24.9p / SC £0.74",
      renewalDate: daysFromNow(110),
      loaStatus: "RECEIVED",
      salespersonId: priya.id,
    },
  });

  const harbourM1 = await prisma.meter.create({
    data: {
      customerId: harbour.id,
      siteName: "Marine Parade hotel",
      siteAddress: "2 Marine Parade, Brighton BN2 1TL",
      fuelType: "ELECTRIC",
      mpan: "002160013300112233445",
      electricEac: 410500,
      supplier: "EDF Energy",
      contractStart: daysFromNow(-320),
      contractEnd: daysFromNow(45),
      meterType: "CT",
      settlement: "NHH",
      currentRates: "Day 27.2p / Night 16.4p / SC £1.40",
      renewalDate: daysFromNow(45),
      loaStatus: "RECEIVED",
      salespersonId: priya.id,
    },
  });
  await prisma.meter.create({
    data: {
      customerId: harbour.id,
      siteName: "Marine Parade hotel",
      siteAddress: "2 Marine Parade, Brighton BN2 1TL",
      fuelType: "GAS",
      mprn: "8822110099",
      gasAq: 540000,
      supplier: "EDF Energy",
      contractStart: daysFromNow(-320),
      contractEnd: daysFromNow(45),
      meterType: "Traditional",
      currentRates: "Unit 7.1p / SC £0.38",
      renewalDate: daysFromNow(45),
      loaStatus: "RECEIVED",
      salespersonId: priya.id,
    },
  });
  await prisma.meter.create({
    data: {
      customerId: harbour.id,
      siteName: "Hove townhouse",
      siteAddress: "19 Church Road, Hove BN3 2AH",
      fuelType: "ELECTRIC",
      mpan: "002160013300112233778",
      electricEac: 98000,
      supplier: "EDF Energy",
      contractStart: daysFromNow(-320),
      contractEnd: daysFromNow(45),
      meterType: "Smart",
      settlement: "NHH",
      currentRates: "Day 27.2p / SC £0.90",
      renewalDate: daysFromNow(45),
      loaStatus: "RECEIVED",
      salespersonId: priya.id,
    },
  });
  await prisma.meter.create({
    data: {
      customerId: harbour.id,
      siteName: "Hove townhouse",
      siteAddress: "19 Church Road, Hove BN3 2AH",
      fuelType: "GAS",
      mprn: "8822110100",
      gasAq: 86000,
      supplier: "EDF Energy",
      contractStart: daysFromNow(-320),
      contractEnd: daysFromNow(45),
      meterType: "Smart",
      currentRates: "Unit 7.1p / SC £0.28",
      renewalDate: daysFromNow(45),
      loaStatus: "RECEIVED",
      salespersonId: priya.id,
    },
  });

  await prisma.meter.create({
    data: {
      customerId: bakery.id,
      siteName: "Stokes Croft bakery",
      siteAddress: "44 Stokes Croft, Bristol BS1 3QD",
      fuelType: "ELECTRIC",
      mpan: "001470014400556677889",
      electricEac: 76400,
      supplier: "Yu Energy",
      contractStart: daysFromNow(-190),
      contractEnd: daysFromNow(175),
      meterType: "Whole current",
      settlement: "NHH",
      currentRates: "Day 29.1p / SC £0.68",
      renewalDate: daysFromNow(175),
      loaStatus: "REQUESTED",
      salespersonId: tom.id,
    },
  });

  const merseyM1 = await prisma.meter.create({
    data: {
      customerId: mersey.id,
      siteName: "Speke warehouse A",
      siteAddress: "Unit 9, Speke Industrial Park, Liverpool L24 8RJ",
      fuelType: "ELECTRIC",
      mpan: "000080015500998877665",
      electricEac: 1280000,
      supplier: "SmartestEnergy",
      contractStart: daysFromNow(-200),
      contractEnd: daysFromNow(200),
      meterType: "CT",
      settlement: "HH",
      currentRates: "HH profile / SC £3.20",
      renewalDate: daysFromNow(200),
      loaStatus: "RECEIVED",
      salespersonId: tom.id,
    },
  });
  await prisma.meter.create({
    data: {
      customerId: mersey.id,
      siteName: "Speke warehouse B",
      siteAddress: "Unit 11, Speke Industrial Park, Liverpool L24 8RJ",
      fuelType: "ELECTRIC",
      mpan: "000080015500998877666",
      electricEac: 860000,
      supplier: "SmartestEnergy",
      contractStart: daysFromNow(-200),
      contractEnd: daysFromNow(200),
      meterType: "CT",
      settlement: "HH",
      currentRates: "HH profile / SC £3.20",
      renewalDate: daysFromNow(200),
      loaStatus: "RECEIVED",
      salespersonId: tom.id,
    },
  });

  await prisma.meter.create({
    data: {
      customerId: parish.id,
      siteName: "Parish hall",
      siteAddress: "12 Bootham, York YO30 7BL",
      fuelType: "GAS",
      mprn: "4411220098",
      gasAq: 18400,
      supplier: "British Gas",
      contractStart: daysFromNow(-500),
      contractEnd: daysFromNow(40),
      meterType: "Traditional",
      currentRates: "Unit 8.4p / SC £0.27",
      renewalDate: daysFromNow(40),
      loaStatus: "NOT_REQUESTED",
      salespersonId: james.id,
    },
  });

  await prisma.meter.create({
    data: {
      customerId: steel.id,
      siteName: "Attercliffe works",
      siteAddress: "Attercliffe Road, Sheffield S9 3RA",
      fuelType: "ELECTRIC",
      mpan: "000080016600223344556",
      electricEac: 2100000,
      supplier: "TotalEnergies",
      contractStart: daysFromNow(-353),
      contractEnd: daysFromNow(12),
      meterType: "CT",
      settlement: "HH",
      currentRates: "HH profile / SC £4.10",
      renewalDate: daysFromNow(12),
      loaStatus: "RECEIVED",
      objectionStatus: "IN_OBJECTION",
      objectionNote: "Debt on account — TotalEnergies raised 8 Aug 2026. Works manager chasing arrears.",
      objectionRaisedOn: daysFromNow(-6),
      salespersonId: james.id,
    },
  });
  await prisma.meter.create({
    data: {
      customerId: steel.id,
      siteName: "Attercliffe works",
      siteAddress: "Attercliffe Road, Sheffield S9 3RA",
      fuelType: "GAS",
      mprn: "7766554433",
      gasAq: 890000,
      supplier: "TotalEnergies",
      contractStart: daysFromNow(-353),
      contractEnd: daysFromNow(12),
      meterType: "Traditional",
      currentRates: "Unit 6.2p / SC £0.55",
      renewalDate: daysFromNow(12),
      loaStatus: "RECEIVED",
      salespersonId: james.id,
    },
  });

  const coastalM1 = await prisma.meter.create({
    data: {
      customerId: coastal.id,
      siteName: "Reception & amenities",
      siteAddress: "Atlantic Dunes Holiday Park, Hayle TR27 5AA",
      fuelType: "ELECTRIC",
      mpan: "001590017700334455112",
      electricEac: 245000,
      supplier: "SSE",
      contractStart: daysFromNow(-345),
      contractEnd: daysFromNow(20),
      meterType: "Whole current",
      settlement: "NHH",
      currentRates: "Day 28.0p / Night 16.8p / SC £1.05",
      renewalDate: daysFromNow(20),
      loaStatus: "REQUESTED",
      salespersonId: helen.id,
    },
  });
  await prisma.meter.create({
    data: {
      customerId: coastal.id,
      siteName: "Reception & amenities",
      siteAddress: "Atlantic Dunes Holiday Park, Hayle TR27 5AA",
      fuelType: "GAS",
      mprn: "9900112233",
      gasAq: 160000,
      supplier: "SSE",
      contractStart: daysFromNow(-345),
      contractEnd: daysFromNow(20),
      meterType: "Smart",
      currentRates: "Unit 7.4p / SC £0.33",
      renewalDate: daysFromNow(20),
      loaStatus: "REQUESTED",
      salespersonId: helen.id,
    },
  });
  await prisma.meter.create({
    data: {
      customerId: coastal.id,
      siteName: "Static caravan block C",
      siteAddress: "Atlantic Dunes Holiday Park, Hayle TR27 5AA",
      fuelType: "ELECTRIC",
      mpan: "001590017700334455113",
      electricEac: 188000,
      supplier: "SSE",
      contractStart: daysFromNow(-345),
      contractEnd: daysFromNow(20),
      meterType: "Whole current",
      settlement: "NHH",
      currentRates: "Day 28.0p / SC £0.88",
      renewalDate: daysFromNow(20),
      loaStatus: "REQUESTED",
      salespersonId: helen.id,
    },
  });

  const riversideLead = await prisma.lead.create({
    data: {
      customerId: riverside.id,
      title: "Care group dual-fuel renewal",
      stage: "SOLD",
      source: "Existing book",
      notes: "Three-site book sold onto E.ON / British Gas 12-month.",
      allocations: { create: [{ agentId: james.id }] },
    },
  });
  const oakfieldLead = await prisma.lead.create({
    data: {
      customerId: oakfield.id,
      title: "Academy electric retender",
      stage: "QUOTED",
      source: "Inbound",
      notes: "Waiting on governors to sign off Octopus vs EDF.",
      allocations: { create: [{ agentId: priya.id }] },
    },
  });
  const harbourLead = await prisma.lead.create({
    data: {
      customerId: harbour.id,
      title: "Hotel group 2026 renewal",
      stage: "SOLD",
      source: "Existing book",
      notes: "Four supplies across Brighton and Hove.",
      allocations: { create: [{ agentId: priya.id }, { agentId: helen.id }] },
    },
  });
  await prisma.lead.create({
    data: {
      customerId: bakery.id,
      title: "Bakery first conversation",
      stage: "CONTACTED",
      source: "Cold call",
      notes: "Samira asked for a callback after the Easter rush.",
      allocations: { create: [{ agentId: tom.id }] },
    },
  });
  const merseyLead = await prisma.lead.create({
    data: {
      customerId: mersey.id,
      title: "HH warehouse book",
      stage: "SOLD",
      source: "Referral",
      notes: "Two HH MPANs onto SmartestEnergy.",
      allocations: { create: [{ agentId: tom.id }] },
    },
  });
  await prisma.lead.create({
    data: {
      customerId: parish.id,
      title: "Parish hall gas",
      stage: "NEW",
      source: "Website",
      notes: "Small AQ, charity rates requested.",
      allocations: { create: [{ agentId: james.id }] },
    },
  });
  await prisma.lead.create({
    data: {
      customerId: steel.id,
      title: "Works HH + gas retender",
      stage: "TENDERING",
      source: "Existing book",
      notes: "Contract ends in 12 days. Quotes in from Total, SSE, Smartest.",
      allocations: { create: [{ agentId: james.id }, { agentId: priya.id }] },
    },
  });
  await prisma.lead.create({
    data: {
      customerId: coastal.id,
      title: "Holiday park renewal",
      stage: "LOA_REQUESTED",
      source: "Existing book",
      notes: "LOA out to Becky. Three supplies, seasonal load.",
      allocations: { create: [{ agentId: helen.id }, { agentId: tom.id }] },
    },
  });

  await prisma.deal.create({
    data: {
      customerId: riverside.id,
      meterId: riversideM1.id,
      leadId: riversideLead.id,
      salespersonId: james.id,
      supplier: "E.ON Next",
      fuelType: "ELECTRIC",
      contractStart: daysFromNow(-400),
      contractEnd: daysFromNow(70),
      renewalDate: daysFromNow(70),
      status: "LIVE",
      dueDate: daysFromNow(-20),
      amountDue: 0,
      estimatedCommission: 4200,
      actualPaid: 4200,
      notes: "Paid in full after start confirmation.",
    },
  });
  await prisma.deal.create({
    data: {
      customerId: riverside.id,
      meterId: riversideM2.id,
      salespersonId: james.id,
      supplier: "British Gas",
      fuelType: "GAS",
      contractStart: daysFromNow(-400),
      contractEnd: daysFromNow(70),
      renewalDate: daysFromNow(70),
      status: "LIVE",
      dueDate: daysFromNow(-20),
      amountDue: 0,
      estimatedCommission: 1850,
      actualPaid: 1850,
    },
  });
  await prisma.deal.create({
    data: {
      customerId: harbour.id,
      meterId: harbourM1.id,
      leadId: harbourLead.id,
      salespersonId: priya.id,
      supplier: "EDF Energy",
      fuelType: "DUAL",
      contractStart: daysFromNow(-320),
      contractEnd: daysFromNow(45),
      renewalDate: daysFromNow(45),
      status: "LIVE",
      dueDate: daysFromNow(14),
      amountDue: 6800,
      estimatedCommission: 6800,
      actualPaid: 0,
      notes: "Commission invoice with finance — due in a fortnight.",
    },
  });
  await prisma.deal.create({
    data: {
      customerId: mersey.id,
      meterId: merseyM1.id,
      leadId: merseyLead.id,
      salespersonId: tom.id,
      supplier: "SmartestEnergy",
      fuelType: "ELECTRIC",
      contractStart: daysFromNow(-200),
      contractEnd: daysFromNow(200),
      renewalDate: daysFromNow(200),
      status: "LIVE",
      dueDate: daysFromNow(30),
      amountDue: 4600,
      estimatedCommission: 9100,
      actualPaid: 4500,
      notes: "First tranche paid. Balance after HH D0010 check.",
    },
  });
  await prisma.deal.create({
    data: {
      customerId: coastal.id,
      meterId: coastalM1.id,
      salespersonId: helen.id,
      supplier: "SSE",
      fuelType: "ELECTRIC",
      contractStart: daysFromNow(-345),
      contractEnd: daysFromNow(20),
      renewalDate: daysFromNow(20),
      status: "LIVE",
      dueDate: daysFromNow(-5),
      amountDue: 3750,
      estimatedCommission: 3750,
      actualPaid: 0,
      notes: "Overdue — chase supplier statement.",
    },
  });

  await prisma.callNote.createMany({
    data: [
      {
        customerId: riverside.id,
        authorId: james.id,
        body: "Spoke with Margaret. Happy with E.ON service. Wants a 12-month again if the day rate stays under 27p.",
      },
      {
        customerId: harbour.id,
        authorId: priya.id,
        body: "Claire confirmed both sites stay on the same start date. Ask EDF for a dual-fuel basket if they can beat last year's SC.",
      },
      {
        customerId: steel.id,
        authorId: james.id,
        body: "Ian is under pressure from the works manager. Needs prices by Friday or they roll onto out-of-contract.",
      },
      {
        customerId: bakery.id,
        authorId: tom.id,
        body: "Left voicemail. Samira texted back — call after 3pm once the ovens are down.",
      },
    ],
  });

  await prisma.emailLog.createMany({
    data: [
      {
        customerId: oakfield.id,
        subject: "Oakfield Academy — electric quote pack",
        fromAddr: "priya.shah@nzce.co.uk",
        toAddr: "d.okonkwo@oakfield-academy.sch.uk",
        body: "David — attached three options (Octopus 12m, EDF 24m, SSE 12m). Happy to walk the governors through EAC vs cost.",
        loggedAt: daysFromNow(-4),
      },
      {
        customerId: coastal.id,
        subject: "LOA for Atlantic Dunes supplies",
        fromAddr: "helen.crowe@nzce.co.uk",
        toAddr: "becky.trevelyan@coastalleisure.co.uk",
        body: "Becky — LOA covering the three park supplies. Sign and return and we will go to market this week.",
        loggedAt: daysFromNow(-2),
      },
      {
        customerId: mersey.id,
        subject: "HH start confirmation — Speke",
        fromAddr: "tom.brennan@nzce.co.uk",
        toAddr: "paul.mckenna@merseylogistics.co.uk",
        body: "Paul — SmartestEnergy have confirmed both MPANs. First commission tranche released.",
        loggedAt: daysFromNow(-18),
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        customerId: steel.id,
        assigneeId: james.id,
        title: "Get three HH quotes on the desk before Friday",
        dueDate: daysFromNow(2),
        status: "OPEN",
      },
      {
        customerId: coastal.id,
        assigneeId: helen.id,
        title: "Chase Becky for signed LOA",
        dueDate: daysFromNow(1),
        status: "OPEN",
      },
      {
        customerId: harbour.id,
        assigneeId: priya.id,
        title: "Raise 90-day renewal pack for Harbour View",
        dueDate: daysFromNow(5),
        status: "OPEN",
      },
      {
        customerId: oakfield.id,
        assigneeId: priya.id,
        title: "Book governors call for quote walkthrough",
        dueDate: daysFromNow(7),
        status: "OPEN",
      },
      {
        customerId: mersey.id,
        assigneeId: tom.id,
        title: "Confirm second commission tranche with finance",
        dueDate: daysFromNow(12),
        status: "OPEN",
      },
      {
        customerId: riverside.id,
        assigneeId: james.id,
        title: "Send care-home renewal reminder",
        dueDate: daysFromNow(-3),
        status: "DONE",
      },
    ],
  });

  await prisma.activity.createMany({
    data: [
      { customerId: riverside.id, actorId: james.id, type: "CUSTOMER_CREATED", summary: "Customer Riverside Care Group Ltd added to the desk." },
      { customerId: riverside.id, actorId: james.id, type: "DEAL_RECORDED", summary: "E.ON Next contract recorded for Riverside Care Group Ltd." },
      { customerId: oakfield.id, actorId: priya.id, type: "LEAD_CREATED", summary: "Lead opened: Academy electric retender." },
      { customerId: oakfield.id, actorId: priya.id, type: "LEAD_STAGE_CHANGED", summary: "Academy electric retender moved to Quoted." },
      { customerId: harbour.id, actorId: priya.id, type: "DEAL_RECORDED", summary: "EDF Energy contract recorded for Harbour View Hotels Ltd." },
      { customerId: bakery.id, actorId: tom.id, type: "LEAD_CREATED", summary: "Lead opened: Bakery first conversation." },
      { customerId: mersey.id, actorId: tom.id, type: "DEAL_RECORDED", summary: "SmartestEnergy contract recorded for Mersey Logistics Ltd." },
      { customerId: parish.id, actorId: james.id, type: "LEAD_CREATED", summary: "Lead opened: Parish hall gas." },
      { customerId: steel.id, actorId: james.id, type: "LEAD_STAGE_CHANGED", summary: "Works HH + gas retender moved to Tendering." },
      { customerId: coastal.id, actorId: helen.id, type: "EMAIL_LOGGED", summary: "Email logged: LOA for Atlantic Dunes supplies." },
    ],
  });

  console.log("Seeded NZCE desk: 4 agents, 8 customers, meters, leads, contracts.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
