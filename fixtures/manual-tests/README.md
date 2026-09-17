# Manual test fixtures

Sample documents for uploading into Document Assistant and validating RAG + citations.

## Files

| File | Type | About |
| --- | --- | --- |
| [`contoso-leave-policy.md`](contoso-leave-policy.md) | Markdown | Contoso HR leave policy: entitlements, booking rules, carry-over, sick leave |
| [`orion-weekly-status.txt`](orion-weekly-status.txt) | Plain text | Orion project weekly status: progress, blockers, next steps, region decision |
| [`northwind-support-escalation.pdf`](northwind-support-escalation.pdf) | PDF | Northwind support escalation policy: severities, SLAs, escalation path |
| [`acme-shipping-label.png`](acme-shipping-label.png) | PNG | ACME warehouse shipping label: SKU, shelf location, reorder point |

## Suggested questions and expected answers

Use one upload at a time first, then mix documents and ask cross-doc questions.

### 1. `contoso-leave-policy.md`

**Ask:** How many annual leave days does a Contoso employee with 4 years tenure get?

**Expect:** About **22 days** per calendar year (3–5 years band). Citation should point at `contoso-leave-policy.md`.

**Ask:** How many leave days can be carried over, and when do they expire?

**Expect:** Up to **5 days**, expiring on **31 March**. Citation from the carry-over section.

---

### 2. `orion-weekly-status.txt`

**Ask:** What is blocking the Orion project right now?

**Expect:** Mentions waiting on a **Bedrock quota increase in eu-central-1** (ticket **QUOTA-4481**) and/or pending design review. Citation: `orion-weekly-status.txt`.

**Ask:** Which AWS region will the demo stay in for now?

**Expect:** **us-east-1** until the eu-central-1 quota is approved.

---

### 3. `northwind-support-escalation.pdf`

**Ask:** What is the first-response target for a SEV-1 incident?

**Expect:** Within **15 minutes** (business hours, CET), with updates every **30 minutes**. Citation: `northwind-support-escalation.pdf`.

**Ask:** Who owns SEV-1 incidents after escalation?

**Expect:** **On-call Engineering** owns SEV-1 until mitigation. Enterprise SEV-1 also notifies Customer Success.

---

### 4. `acme-shipping-label.png`

Image uploads are OCR'd on upload (Bedrock vision → companion `.extracted.txt`) so the default Knowledge Base text parser can index them.

**Ask:** What is the warehouse shelf location for ACME-BOTTLE-500?

**Expect:** Aisle **7** / Bin **C-14**, warehouse **WH-BERLIN-02**. Citation may reference the extracted text companion or the image filename.

**Ask:** What is the reorder point for Alpine Spring Water 500ml?

**Expect:** **1200 units**.

> Re-upload the PNG after deploying the vision OCR change so a fresh `.extracted.txt` companion is created and ingested.

---

## Cross-document checks

After all text/PDF docs are **ready**:

**Ask:** Compare Contoso leave carry-over limits with Northwind SEV-1 response time.

**Expect:** Mentions Contoso **5-day** carry-over and Northwind SEV-1 **15-minute** response, with citations from both sources.

**Ask:** According to the Orion notes, where should fixtures for manual RAG tests be added?

**Expect:** Something about adding fixture documents for manual RAG regression tests (from next-week plan). Citation: `orion-weekly-status.txt`.

## How to use

1. Open the deployed app (or `npm run dev` with `.env.local`).
2. Upload the files from this folder.
3. Wait until status is **ready** (UI polls while **indexing**).
4. Ask the questions above and confirm answer content + citation chips.

## Regenerating binary fixtures

```bash
python3 scripts/generate-manual-fixtures.py
```
