import { addDays, toDateKey } from "./links";
import type {
  BackupProvider,
  BackupState,
  Customer,
  Estimate,
  Expense,
  Invoice,
  Job,
  OutboxItem,
  TimeEntry,
  Trip,
} from "./types";

const check = (labels: string[], doneCount = 0) =>
  labels.map((label, i) => ({ id: `c${i}`, label, done: i < doneCount }));

export function createMockState(now: Date) {
  const today = toDateKey(now);
  const ts = now.getTime();
  const at = (hour: number, min = 0) => {
    const d = new Date(now);
    d.setHours(hour, min, 0, 0);
    return d.getTime();
  };

  const customers: Customer[] = [
    {
      id: "cus_1",
      name: "Maria Delgado",
      phone: "(512) 555-0142",
      email: "maria.delgado@example.com",
      customerSince: "2021-04-12",
      notes: "Gate code 4471. Friendly dog (Biscuit) in backyard.",
      equipment: [
        {
          id: "eq_1",
          name: "Central A/C Condenser",
          model: "Trane XR14 3-ton",
          serial: "TR-19A44721",
          installed: "2019-06-03",
          history: [
            { date: "2025-06-14", summary: "Seasonal tune-up. Coil cleaned, refrigerant 118 psi." },
            { date: "2024-07-02", summary: "Replaced 45/5 µF run capacitor." },
          ],
        },
        {
          id: "eq_2",
          name: "Gas Furnace",
          model: "Carrier 59SC5 80k BTU",
          serial: "CR-2207B1180",
          installed: "2019-06-03",
          history: [{ date: "2025-11-20", summary: "Flame sensor cleaned, filter replaced." }],
        },
      ],
    },
    {
      id: "cus_2",
      name: "Dave & Kim Okafor",
      phone: "(512) 555-0198",
      email: "okafor.home@example.com",
      customerSince: "2023-09-01",
      notes: "Prefers text over calls. Park on street.",
      equipment: [
        {
          id: "eq_3",
          name: "Tankless Water Heater",
          model: "Rinnai RU199iN",
          serial: "RN-88310452",
          installed: "2022-02-18",
          history: [{ date: "2025-02-10", summary: "Annual descale flush. Inlet filter cleaned." }],
        },
      ],
    },
    {
      id: "cus_3",
      name: "Hillcrest Dental (Dr. Patel)",
      phone: "(512) 555-0110",
      email: "office@hillcrestdental.example.com",
      customerSince: "2020-01-15",
      notes: "Commercial. Service before 9am or after 5pm only. Check in at front desk.",
      equipment: [
        {
          id: "eq_4",
          name: "Rooftop Unit #2",
          model: "Lennox LGH 7.5-ton",
          serial: "LN-5609XR2",
          installed: "2017-08-21",
          history: [
            { date: "2025-09-05", summary: "Belt replaced. Economizer actuator sticking — monitor." },
            { date: "2025-03-11", summary: "Filters (4x 20x25x2) replaced." },
          ],
        },
      ],
    },
    {
      id: "cus_4",
      name: "Tom Brennan",
      phone: "(512) 555-0176",
      email: "tbrennan@example.com",
      customerSince: "2026-10-28",
      notes: "New customer — referred by Maria Delgado.",
      equipment: [],
    },
  ];

  const baseJob = { notes: "", photos: [], signature: null, activity: [], priority: "normal" as const };

  const jobs: Job[] = [
    {
      ...baseJob,
      id: "job_1",
      customerId: "cus_3",
      title: "RTU #2 economizer repair",
      serviceType: "Commercial HVAC",
      date: today,
      startHour: 7.5,
      durationHrs: 1.5,
      status: "completed",
      address: "2400 Hillcrest Dr, Austin, TX 78745",
      checklist: check(
        ["Lockout / tagout unit", "Inspect economizer linkage", "Replace actuator", "Test damper travel", "Clean up site"],
        5,
      ),
      notes: "Actuator replaced w/ Belimo LF24. Damper travel full open/close OK.",
      signature: null,
      activity: [{ at: at(9, 2), text: "Job marked completed" }],
    },
    {
      ...baseJob,
      id: "job_2",
      customerId: "cus_1",
      title: "A/C not cooling — diagnostic",
      serviceType: "Residential HVAC",
      date: today,
      startHour: 10,
      durationHrs: 2,
      status: "in_progress",
      priority: "urgent",
      address: "1817 Barton Hills Dr, Austin, TX 78704",
      checklist: check(
        [
          "Verify thermostat settings",
          "Check & replace air filter",
          "Inspect capacitor & contactor",
          "Measure refrigerant pressures",
          "Clean condenser coil",
          "Confirm supply/return temp split",
        ],
        2,
      ),
      notes:
        "cust says unit blowing warm since sat. filter was filthy repl w 16x25x1. cap reading 38uf on herm side shld be 45 - weak. contactor pitted. suction 62psi low?? poss leak, need dye test",
      activity: [
        { at: at(9, 41), text: "Status → En route" },
        { at: at(10, 4), text: "Status → In progress" },
      ],
    },
    {
      ...baseJob,
      id: "job_3",
      customerId: "cus_2",
      title: "Tankless water heater flush",
      serviceType: "Plumbing",
      date: today,
      startHour: 13,
      durationHrs: 1.5,
      status: "scheduled",
      address: "905 W Mary St, Austin, TX 78704",
      checklist: check([
        "Shut off gas & water",
        "Connect flush kit",
        "Circulate descaler 45 min",
        "Clean inlet filter",
        "Restore & test hot water",
      ]),
    },
    {
      ...baseJob,
      id: "job_4",
      customerId: "cus_4",
      title: "New system estimate walkthrough",
      serviceType: "Sales / Estimate",
      date: today,
      startHour: 15.5,
      durationHrs: 1,
      status: "scheduled",
      address: "4210 Avenue F, Austin, TX 78751",
      checklist: check(["Measure home sq ft", "Inspect ductwork", "Photograph existing equipment", "Review options with customer"]),
    },
    {
      ...baseJob,
      id: "job_5",
      customerId: "cus_1",
      title: "Furnace safety inspection",
      serviceType: "Residential HVAC",
      date: addDays(today, 1),
      startHour: 9,
      durationHrs: 1,
      status: "scheduled",
      address: "1817 Barton Hills Dr, Austin, TX 78704",
      checklist: check(["CO test", "Inspect heat exchanger", "Clean flame sensor", "Replace filter"]),
    },
    {
      ...baseJob,
      id: "job_6",
      customerId: "cus_3",
      title: "Quarterly filter change",
      serviceType: "Commercial HVAC",
      date: addDays(today, 2),
      startHour: 7,
      durationHrs: 1,
      status: "scheduled",
      address: "2400 Hillcrest Dr, Austin, TX 78745",
      checklist: check(["Replace 4x RTU filters", "Inspect belts", "Log readings"]),
    },
    {
      ...baseJob,
      id: "job_7",
      customerId: "cus_2",
      title: "Leaking kitchen faucet",
      serviceType: "Plumbing",
      date: addDays(today, 3),
      startHour: 11,
      durationHrs: 1,
      status: "scheduled",
      address: "905 W Mary St, Austin, TX 78704",
      checklist: check(["Shut off supply", "Replace cartridge", "Test for leaks"]),
    },
  ];

  const tier = (name: string, summary: string, items: [string, number, number][]) => ({
    name,
    summary,
    items: items.map(([description, qty, unitPrice], i) => ({ id: `li${i}`, description, qty, unitPrice })),
  });

  const estimates: Estimate[] = [
    {
      id: "est_1",
      number: "EST-1042",
      customerId: "cus_1",
      jobId: "job_2",
      title: "A/C repair options",
      status: "approved",
      selectedTier: "better",
      taxRate: 0.0825,
      createdAt: at(10, 30),
      invoiceId: null,
      tiers: {
        good: tier("Good", "Get cooling today", [
          ["Diagnostic & service call", 1, 89],
          ["Run capacitor 45/5 µF", 1, 145],
          ["R-410A refrigerant (per lb)", 2, 95],
        ]),
        better: tier("Better", "Repair + leak fix", [
          ["Diagnostic & service call", 1, 89],
          ["Run capacitor 45/5 µF", 1, 145],
          ["Contactor 2-pole 40A", 1, 165],
          ["Leak search & brazed repair", 1, 425],
          ["R-410A refrigerant (per lb)", 4, 95],
        ]),
        best: tier("Best", "Repair + 2-yr protection", [
          ["Diagnostic & service call", 1, 89],
          ["Run capacitor 45/5 µF", 1, 145],
          ["Contactor 2-pole 40A", 1, 165],
          ["Leak search & brazed repair", 1, 425],
          ["R-410A refrigerant (per lb)", 4, 95],
          ["Hard-start kit", 1, 210],
          ["2-yr maintenance plan", 1, 299],
        ]),
      },
    },
    {
      id: "est_2",
      number: "EST-1043",
      customerId: "cus_4",
      jobId: "job_4",
      title: "Whole-home system replacement",
      status: "draft",
      selectedTier: "better",
      taxRate: 0.0825,
      createdAt: ts - 86_400_000,
      invoiceId: null,
      tiers: {
        good: tier("Good", "14 SEER2 single-stage", [
          ["3-ton 14 SEER2 condenser + coil", 1, 5200],
          ["Installation labor", 1, 1800],
        ]),
        better: tier("Better", "16 SEER2 two-stage", [
          ["3-ton 16 SEER2 two-stage system", 1, 7400],
          ["Installation labor", 1, 2100],
          ["Smart thermostat", 1, 320],
        ]),
        best: tier("Best", "Variable-speed + air quality", [
          ["3-ton 20 SEER2 variable-speed system", 1, 10900],
          ["Installation labor", 1, 2400],
          ["Smart thermostat", 1, 320],
          ["Whole-home air purifier", 1, 1150],
        ]),
      },
    },
  ];

  const invoices: Invoice[] = [
    {
      id: "inv_1",
      number: "INV-2087",
      customerId: "cus_3",
      jobId: "job_1",
      estimateId: null,
      title: "RTU #2 economizer repair",
      items: [
        { id: "li0", description: "Commercial service call", qty: 1, unitPrice: 145 },
        { id: "li1", description: "Belimo LF24 actuator", qty: 1, unitPrice: 389 },
        { id: "li2", description: "Labor (hrs)", qty: 1.5, unitPrice: 125 },
      ],
      taxRate: 0.0825,
      status: "unpaid",
      createdAt: at(9, 5),
      dueDate: addDays(today, 30),
      paidAt: null,
      paidMethod: null,
    },
  ];

  const outbox: OutboxItem[] = [
    { id: "ob_1", kind: "status", label: "Hillcrest Dental → Completed", at: at(9, 2) },
    { id: "ob_2", kind: "note", label: "Notes updated · A/C diagnostic", at: at(10, 22) },
  ];

  const timeEntries: TimeEntry[] = [{ id: "te_1", clockIn: at(7, 4), clockOut: at(9, 15) }];

  const expenses: Expense[] = [
    {
      id: "ex_1",
      amount: 64.18,
      category: "Fuel",
      vendor: "Shell — S Lamar",
      date: today,
      note: "",
      receiptUrl: null,
      createdAt: at(6, 52),
    },
    {
      id: "ex_2",
      amount: 142.5,
      category: "Parts & Materials",
      vendor: "Johnstone Supply",
      date: addDays(today, -1),
      note: "Capacitors x3, contactor",
      receiptUrl: null,
      createdAt: ts - 86_400_000,
    },
  ];

  const trips: Trip[] = [
    { id: "tr_1", purpose: "Home → Hillcrest Dental", startAt: at(7, 6), startOdometer: 48211.4, endAt: at(7, 24), endOdometer: 48219.9 },
    { id: "tr_2", purpose: "Hillcrest → Johnstone Supply", startAt: at(9, 14), startOdometer: 48219.9, endAt: at(9, 31), endOdometer: 48226.2 },
    { id: "tr_3", purpose: "Supply → Delgado residence", startAt: at(9, 42), startOdometer: 48226.2, endAt: at(10, 1), endOdometer: 48232.7 },
  ];

  const backups: Record<BackupProvider, BackupState> = {
    gdrive: { status: "idle", progress: 0, lastBackupAt: ts - 2 * 86_400_000 },
    onedrive: { status: "idle", progress: 0, lastBackupAt: null },
    dropbox: { status: "idle", progress: 0, lastBackupAt: ts - 9 * 86_400_000 },
    box: { status: "idle", progress: 0, lastBackupAt: null },
    mega: { status: "idle", progress: 0, lastBackupAt: null },
  };

  return {
    today,
    customers,
    jobs,
    estimates,
    invoices,
    outbox,
    timeEntries,
    expenses,
    trips,
    backups,
    business: {
      name: "Thompson Field Services",
      owner: "Chris Thompson",
      maskedLine: "(512) 555-0100",
    },
  };
}

export type AppData = ReturnType<typeof createMockState>;
