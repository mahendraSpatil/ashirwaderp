# Ashirwad Nursing Home ERP Backend

Express.js + MongoDB (Mongoose) backend for the Ashirwad Nursing Home ERP portal.

## Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medichain
```

## Run

```bash
npm run dev
```

## API Routes

### Prescriptions (`/api/prescriptions`)
- `GET /` — list all (filter by `?status=Pending|Approved_Pending_Payment|Paid_And_Dispensed`)
- `POST /` — doctor creates a new e-Rx (status starts at `Pending`)
- `PATCH /:id/advance` — advance through the 3-step lock

### Inventory (`/api/inventory`)
- `GET /` — live stock levels, FIFO sorted by expiry
- `POST /deduct` — deduct stock (called only at dispense step)
- `GET /forecast` — AI demand prediction based on EDDs

### Patients (`/api/patients`)
- `GET /` — all patients
- `GET /:upid` — single patient with vitals + documents
- `POST /:upid/vitals` — nurse logs triage vitals
- `POST /:upid/documents` — PCPNDT document upload with hash

### Audit (`/api/audit`)
- `GET /` — blockchain audit log (last 100 blocks)
- `POST /` — append a new block (auto-generates SHA-256 hash + chain link)
- `GET /verify` — verify chain integrity

## Mongoose Schemas

- **User**: fullName, email, role (Doctor/Nurse/Pharmacist/Admin)
- **Patient**: upid, name, lmp, edd, vitals[], documents[]
- **Medicine & Batch**: medicineName, batchId, quantity, expiryDate (FIFO)
- **Prescription**: status enum `['Pending', 'Approved_Pending_Payment', 'Paid_And_Dispensed']`
- **AuditLog**: action, actor, hash, previousHash, blockNumber
