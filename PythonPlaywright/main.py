from playwright.sync_api import sync_playwright
import pandas as pd
import time
from scraper import get_search_results, extract_business_data

SEARCH_URL = "https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page=1"
MAX_PAGES = 15

def main(playwright):
    records = []
    seen_urls = set()
    chrome = playwright.chromium
    browser = chrome.launch(headless=False, slow_mo=100)
    page = browser.new_page()

    for page_num in range(1, MAX_PAGES + 1):
        search_page_url = SEARCH_URL.replace("page=1", f"page={page_num}")
        business_urls = get_search_results(page, search_page_url)
        print(len(business_urls))

        for url_suffix in business_urls:
            full_url = f"https://www.bbb.org{url_suffix}"
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            try:
                data = extract_business_data(page, full_url)
                records.append(data)
                time.sleep(1)
            except Exception as e:
                print(f"Failed to scrape {full_url}: {e}")

    df = pd.DataFrame(records)
    df.drop_duplicates(subset=["url"], inplace=True)
    df.to_csv("medical_billing_companies.csv", index=False)

    browser.close()
    playwright.stop()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        main(playwright)