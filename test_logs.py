from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        def handle_console(msg):
            print(f"[{msg.type}] {msg.text}")
            
        def handle_error(err):
            print(f"[PAGE FATAL ERROR] {err}")
            
        page.on("console", handle_console)
        page.on("pageerror", handle_error)
        
        print("Navigating to local index...")
        page.goto("http://localhost:8000/index.html#/billing")
        page.wait_for_timeout(2000)
        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()
