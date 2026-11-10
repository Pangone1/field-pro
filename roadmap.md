# Roadmap

## Phase 1 — Backend & integrations
- [ ] Database for jobs, customers, mileage logs, invoices (replace sample data), with sign-in
- [ ] Connect user's own Stripe account; wire invoice payments (waits on user's Stripe secret key)

## Phase 2 — UI
- [ ] Today: "+" button at right of stats row, one line
- [ ] Schedule: [Day] [Week] [Month] [+] toggle, "+" opens New Job form
- [ ] New Job form: title, customer, address, date, start, end, status, Save Job
- [ ] Mileage: Address From / To inputs; End Trip logs from, to, elapsed time, odometer
- [ ] Backup hub: Google Drive, OneDrive, Dropbox buttons

## Phase 3 — Offline
- [ ] Dexie 'SoloContractorDB' with syncQueue; Save Job + End Trip queue offline; auto-push on reconnect

## Phase 4 — Automations
- [ ] /api/incoming-job webhook: parse Name, Phone, Address, Issue → new "Pending" job
