# BBB Medical Billing Scraper
## Part B / C (Stagehand & Next.js)

# Setup:
Clone and Install
```
git clone https://github.com/johnhooft/CanvasScrapper
cd stagehand-bbb-scraper
npm install
```

Setup .env
` cp env.example .env.local `

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
- Form that accepts a Search URL to be scrapped.
- Scrapes pages 1 to 15 of the inputed Search URL.
- Extracts: name, phone, principal contact, URL, address, accreditation status if available. If data cannot be extracted value is set to None.
- Toggle component controls between "LLM" and "Explicit" extraction modes.
- Deduplicates by business Name.
- Realtime updates via Supabase channel subscriptions.
- Persistant data storage.
- Outputs a tablular format aswell as a CSV of the extracted data.

## API Routes:
`POST /api/scrape` - Runs scraping job.
`POST /api/submit-business` - Adds Business data to Supabase Table if unique.
`POST /api/delete` - Deletes all businesses from Supabase Table.

## Scripts:
`app/lib/scraper.ts` - Documented Web Scrapping script.

## Analysis of Playwright vs Stagehand
Stagehand vs. Playwright

Playwright:
- Fast and efficient, suitable for high-throughput scraping.
- Produces consistent, deterministic results when DOM structure is stable.
- Fragile in the face of website changes—scrapers relying on exact selectors or DOM paths are likely to break if the structure shifts.

Stagehand
- More resilient to layout or structural changes, as it relies on semantic interpretation rather than strict selectors.
- Slower and more resource-intensive due to LLM-based processing.
- Output may vary depending on the LLM's interpretation, especially in ambiguous or loosely structured content.