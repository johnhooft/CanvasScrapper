# BBB Medical Billing Scraper
## Part A (Python & Playwright)

**Search URL:**
https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page=1

## What it does:
- Scrapes pages 1 to 15 of BBB Medical Billing businesses with A rating
- Extracts: name, phone, principal contact, URL, address, accreditation status if available. If data cannot be extracted value is set to None.
- Deduplicates by business URL
- Outputs a CSV `medical_billing_companies.csv`

## How to run:
1. Install dependencies:
pip install playwright pandas
playwright install

2. Run:
python main.py

## Issues Encountered:
- Running the script multiple times results in different length csv files.
- Required Extracted data was not available in one location. Solution was a combination of:
- - JavaScript Variable Extraction via the `window.__PRELOADED_STATE__`
- - JSON-LD Schema Parsing by targeting the embedded `application/ld+json` script tag.