# BBB Medical Billing Scraper
## Part B / C (Stagehand & Next.js)

**To Run the Server:**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Search URL:**
https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page=1

## What it does:
- UI with feild that accepts a Search URL to be inputed
- Scrapes pages 1 to 15 of the inputed Search URL
- Extracts: name, phone, principal contact, URL, address, accreditation status if available. If data cannot be extracted value is set to None.
- Deduplicates by business URL
- Outputs a tablular format aswell as a CSV of the extracted data.