from playwright.sync_api import sync_playwright
import re
import json

def get_search_results(page, url):
    page.goto(url, timeout=60000, wait_until='domcontentloaded')
    links = page.locator("a[href*='/profile/'].text-blue-medium").all()
    return [link.get_attribute("href") for link in links if link.get_attribute("href")]

def extract_preloaded_state(page):
    html = page.content()

    match = re.search(
        r"<script>\s*window\.__PRELOADED_STATE__\s*=\s*({.*?})\s*;\s*</script>",
        html,
        re.DOTALL
    )

    if not match:
        print("Could not find __PRELOADED_STATE__ in page source.")
        return None

    raw_json = match.group(1)

    try:
        data = json.loads(raw_json)
        return data
    except json.JSONDecodeError as e:
        print("Failed to parse JSON from __PRELOADED_STATE__:", e)
        return None

def extract_business_data(page, url):
    page.goto(url, timeout=60000, wait_until="domcontentloaded")

    page_source_json = extract_preloaded_state(page)

    accredited = page_source_json["businessProfile"]["accreditationInformation"]["isAccredited"]

    principal = next(
        (contact['name'] for contact in page_source_json["businessProfile"]["contactInformation"]["contacts"] if contact.get("isPrincipal")),
        None
    )

    if principal:
        principal_str = " ".join(
            str(principal.get(part)) for part in ["prefix", "first", "middle", "last", "suffix"] if principal.get(part)
        )
    else:
        principal_str = None

    try:
        domain = page_source_json["businessProfile"]["urls"]["primary"]
    except (KeyError, TypeError):
        domain = None
    
    schema_data = page.locator("script[type='application/ld+json']").text_content()
    json_data = json.loads(schema_data)[0]

    name = json_data["name"]
    address_fields = ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"]
    address_str = ", ".join(filter(None, map(json_data["address"].get, address_fields)))
    phone = json_data.get("telephone") or None

    return {
        "name": name,
        "phone": phone,
        "principal_contact": principal_str,
        "url": domain,
        "address": address_str,
        "accreditation_status": accredited
    }
