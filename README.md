# Field Pro

Help me build an AI-powered app using Gemini.

Act as an expert React and Tailwind developer. Build a mobile-first Progressive Web App (PWA) designed specifically for a solo field service contractor. The app must be highly responsive, featuring a bottom tab navigation bar and full Dark Mode support. Use Lucide-React for all icons. 



Build the UI components and mock the local state for the following 9 feature modules. Do not attempt to write the Service Worker or IndexedDB background sync logic; just build the UI and state arrays to hold this data. I will inject the offline persistence code later.



### 1. Job Management & Field Execution

- **Job Feed:** A daily schedule view showing assigned jobs with routing links.

- **Job Details Component:** Displays customer profile, service address, and equipment history.

- **Media & Notes:** UI for capturing pre/post-work photos and text areas for job notes.

- **AI Notes+:** A button next to the notes field labeled "Clean Up Notes (AI)".

- **Checklists:** Interactive task checklists that can be toggled completed.

- **eSignature:** A canvas element for the customer to sign on the glass.



### 2. Offline Mode (UI Preparedness)

- **Status Indicator:** A persistent top-bar icon showing "Online" (green) or "Offline" (red).

- **Sync Queue:** A visual "Outbox" badge showing how many actions (notes, photos, status changes) are pending upload when the device regains signal.



### 3. Scheduling & Routing

- **Calendar View:** A drag-and-drop daily/weekly calendar interface.

- **Navigation:** Deep-links on job cards that open the native Google Maps app with the destination address pre-filled.



### 4. Estimates, Invoicing & Job Costing

- **Estimate Builder:** A screen to create custom "Good/Better/Best" tier estimates with line items.

- **1-Click Conversion:** A button to convert an approved estimate directly into an active job invoice.

- **Invoice Generator:** A view summarizing the final bill with line items and taxes.



### 5. Mobile Payments

- **Payment Screen:** A UI showing the total due with buttons for "Tap-to-Pay (NFC)", "Manual Card Entry", and "ACH Transfer".



### 6. Communication

- **SMS Alerts:** Buttons on the Job Details screen to trigger "On my way" and "Running late" SMS templates.

- **VoIP Integration:** A "Call Customer" button that masks the contractor's personal number.



### 7. Time Tracking & Admin

- **Timesheet:** A persistent "Clock In / Clock Out" toggle in the app drawer.

- **Expense Scanner:** A form to input expense amounts with a camera button for receipt capture.



### 8. Custom GPS & Mileage Tracker

- **Tracker UI:** A dedicated tab showing today's total mileage, a "Start Trip" / "End Trip" toggle, and a daily activity log table detailing timestamps and odometer readings.



### 9. Custom Cloud Backup Hub

- **Backup Dashboard:** A settings screen titled "Data Backups".

- Include 5 distinct action buttons labeled: "Backup to Google Drive", "Backup to OneDrive", "Backup to Dropbox", "Backup to Box", and "Backup to MEGA".



Please build the complete front-end structure, mock the local data using React state, and ensure the UI is po

lished, professional, and mobile-optimized.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a6a27ea0-6542-4b51-96fb-ba214ad026f3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
