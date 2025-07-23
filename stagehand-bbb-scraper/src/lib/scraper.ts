import { Stagehand, Page } from "@browserbasehq/stagehand";
import { z } from 'zod';

const SEARCH_URL = "https://www.bbb.org/search?filter_category=60548-100&filter_category=60142-000&filter_ratings=A&find_country=USA&find_text=Medical+Billing&page=1";
const MAX_PAGES = 15;

// BusinessData represents the extracted information of a business, including its name, phone number, principal contact, URL, address, and accreditation status.
type BusinessData = {
  name: string | null;
  phone: string | null;
  principal_contact: string | null;
  url: string | null;
  address: string | null;
  accreditation_status: boolean | null;
};


/**
 * This function navigates to a the search URL, waits for the page to load and then extracts all the href attributes from links that match the specified selector.
 * The selector targets the profile links for each business on the search results pages.
 * It returns an array of profile links.
 * 
 * @param page - The Stagehand Page object to perform actions on.
 * @param url - The search URL
 * @returns A Promise that resolves to an array of strings, each representing a business profile link.
 */
async function getSearchResults(page: Page, url: string): Promise<string[]> {
  await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });
  await page.waitForSelector("a[href*='/profile/'].text-blue-medium", { state: "attached", timeout: 10000 });
  const links = await page.locator("a[href*='/profile/'].text-blue-medium").elementHandles();
  const hrefs: string[] = [];
  for (const link of links) {
    const href = await link.getAttribute("href");
    if (href) hrefs.push(href);
  }
  return hrefs;
}

/**
 * This function accepts a page and extracts the raw HTML from it.
 * the selector then targets a sub section of that HTML and returns it.
 * 
 * @param page - The Stagehand Page object to perform actions on.
 * @returns A Promise that resolves a section of HTML in the page source.
 */
async function extractPreloadedState(page: Page): Promise<unknown | null> {
  const html = await page.content();
  // Remove the 's' flag for ES2017 compatibility
  const match = html.match(/<script>\s*window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?})\s*;\s*<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * This function accepts a page and a business profile URL.
 * In then navigates to the given URL and extracts structured business data from two sources on the page:
 *    - The embedded JSON in the __PRELOADED_STATE
 *    - The Schema.org data in <script type="application/ld+json">
 * In then uses selectors to target:
 *    - Business Accreditation Statue
 *    - Principal Contact Name
 *    - Official Website Domain
 *    - Business Name
 *    - Formatted Mailing Address
 *    - Phone Number
 * 
 * @param page - The Stagehand Page object to perform actions on.
 * @param url - The target Business Profile URL.
 * @returns A Promise that resolves to structured business data on the targeted business.
 */
async function extractBusinessDataExplicit(page: Page, url: string): Promise<BusinessData> {
  await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });
  // Wait for the structured data script to appear
  await page.waitForSelector("script[type='application/ld+json']", { state: "attached", timeout: 10000 });

  // Extract __PRELOADED_STATE__
  const pageSourceJson = await extractPreloadedState(page) as Record<string, unknown> | null;

  let accredited: boolean | null = null;
  let principal: Record<string, unknown> | null = null;
  let principalStr: string | null = null;
  let domain: string | null = null;

  if (pageSourceJson && typeof pageSourceJson === 'object' && 'businessProfile' in pageSourceJson) {
    const businessProfile = pageSourceJson.businessProfile as Record<string, unknown>;
    try {
      if (businessProfile.accreditationInformation && typeof businessProfile.accreditationInformation === 'object') {
        accredited = (businessProfile.accreditationInformation as Record<string, unknown>).isAccredited as boolean;
      }
    } catch {}
    try {
      if (businessProfile.contactInformation && typeof businessProfile.contactInformation === 'object') {
        const contacts = (businessProfile.contactInformation as Record<string, unknown>).contacts as Array<Record<string, unknown>>;
        principal = contacts.find((c) => c.isPrincipal) || null;
        if (principal?.isPrincipal && typeof principal.name === 'object' && principal.name !== null){
          const nameObj = principal.name as Record <string, unknown>;
          principalStr = ["prefix", "first", "middle", "last", "suffix"].map(part => typeof nameObj[part] === 'string' ? nameObj[part] as string : '').filter(Boolean).join(" ");
        }

      }
    } catch {}
    try {
      if (businessProfile.urls && typeof businessProfile.urls === 'object') {
        domain = (businessProfile.urls as Record<string, unknown>).primary as string;
      }
    } catch {}
  }

  // Extract schema.org data
  const schemaData = await page.locator("script[type='application/ld+json']").first().textContent();
  let jsonData: Record<string, unknown> | null = null;
  if (schemaData) {
    try {
      const parsed = JSON.parse(schemaData);
      jsonData = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {}
  }

  let name: string | null = null;
  let addressStr: string | null = null;
  let phone: string | null = null;
  if (jsonData && typeof jsonData === 'object') {
    name = (jsonData.name && typeof jsonData.name === 'string') ? jsonData.name : null;
    const addressFields = ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"];
    if (jsonData.address && typeof jsonData.address === 'object' && jsonData.address !== null) {
      const addressObj = jsonData.address as Record<string, unknown>;
      addressStr = addressFields.map(f => (addressObj[f] && typeof addressObj[f] === 'string') ? addressObj[f] as string : '').filter(Boolean).join(", ");
    }
    phone = (jsonData.telephone && typeof jsonData.telephone === 'string') ? jsonData.telephone : null;
  }

  console.log(`\nAccredited: ${accredited}, Principal: ${principalStr}, Domain: ${domain}`);
  console.log(`Name: ${name}, Address: ${addressStr}, Phone: ${phone}\n`);

  return {
    name,
    phone,
    principal_contact: principalStr,
    url: domain,
    address: addressStr,
    accreditation_status: accredited,
  };
}

/**
 * This function accepts a page and a business profile URL.
 * In then navigates to the given URL and extracts structured business data using two different LLM based extractors.
 * It uses 2 instead of 1 to limit scope and increase accuracy of extractor.
 * The LLM based Stagehand extractors target the following data:
 *    - Business Accreditation Statue
 *    - Principal Contact Name
 *    - Official Website Domain
 *    - Business Name
 *    - Formatted Mailing Address
 *    - Phone Number
 * 
 * @param page - The Stagehand Page object to perform actions on.
 * @param url - The target Business Profile URL.
 * @returns A Promise that resolves to structured business data on the targeted business.
 */
async function extractBusinessDataLLM(page: Page, url: string): Promise<BusinessData> {
  

  await page.goto(url, { timeout: 60000, waitUntil: "domcontentloaded" });
  await page.waitForSelector("script[type='application/ld+json']", { state: "attached", timeout: 10000 });

  let accredited: boolean | null = null;
  let principalStr: string | null = null;
  let domain: string | null = null;

  // First LLM Based Extractor
  const extractResultsFromDOM = await page.extract({
    instruction: "extract the follow details about the business, their accreditation status (boolean), their principal contact full name, and their domain url associated with the hyper link 'visit website'.",
    schema: z.object({
      accredited: z.boolean(),
      principalContact: z.string().nullable().describe("The full name of the Principal Contact, exluding their employee type at the end of their name (member, owner, representative, agent, etc. Remove trailing commas"),
      domain: z.string().url().nullable().describe("The URL link the hyperlink text 'Visit Website' contains. Located above 'Write a Review'"),
    })
  });
  ({ accredited, principalContact: principalStr, domain } = extractResultsFromDOM);

  let name: string | null = null;
  let addressStr: string | null = null;
  let phone: string | null = null;

  // Second LLM Based Extractor
  const extractResultsFromSchema = await page.extract({
    instruction: "Extract business details, including business name, phone number, and mailing address.",
    schema: z.object({
      name: z.string().nullable(),
      addressStr: z.string().nullable().describe("The mailing address of business, located in overview section"),
      phone: z.string().nullable().describe("The phone number for the business, located above 'write a review'."),
    })
  });

  ({name, addressStr, phone} = extractResultsFromSchema)
  
  console.log(`\nAccredited: ${accredited}, Principal: ${principalStr}, Domain: ${domain}`);
  console.log(`Name: ${name}, Address: ${addressStr}, Phone: ${phone}\n`);

  return {
    name,
    phone,
    principal_contact: principalStr,
    url: domain,
    address: addressStr,
    accreditation_status: accredited,
  };
}

export async function runScraper(searchUrl: string = SEARCH_URL, LLM: boolean): Promise<BusinessData[]> {
  console.log(`llm: ${LLM}`)
  // Initalize Stagehand object with Proxies enabled to bypass cloudflare
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    verbose: 1,
    //logger: console.log,
    disablePino: true,
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      proxies: true, /* Using Browserbase's Proxies */ 
    },
    localBrowserLaunchOptions: {
      locale: "en-US",
      extraHTTPHeaders: {
        'User-Agent': 'Custom Agent',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.bbb.org/',
      }
    }
  });

  const records: BusinessData[] = [];
  const seenUrls = new Set<string>();

  try {
    await stagehand.init();
    const page = stagehand.page;

    // Loop through number of pages defined
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const pageUrl = searchUrl.replace("page=1", `page=${pageNum}`);

      // Get all Business profile URLs on Search page
      const businessUrls = await getSearchResults(page, pageUrl);

      // Loop through each business on page and visit their profile
      for (const urlSuffix of businessUrls) {
        const fullUrl = `https://www.bbb.org${urlSuffix}`;
        if (seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);
        try {
          let data;

          // Extract business data
          if (LLM) { data = await extractBusinessDataLLM(page, fullUrl);} 
          else { data = await extractBusinessDataExplicit(page, fullUrl);}
          records.push(data);
          
          // push data to Supabase
          try {
            const response = await fetch("http://localhost:3000/api/submit-business", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          } catch (error) {
            console.error('Error:', error);
          }
        } catch (e) {
          console.warn(`Failed to scrape ${fullUrl}:`, e);
        }
      }
    }
    return records;
  } finally {
    await stagehand.close();
  }
}
