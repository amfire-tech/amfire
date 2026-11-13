// Tells Bing (and the other IndexNow search engines: Yandex, Seznam, Naver) which public
// pages exist or changed, so they recrawl them within hours instead of weeks. Bing's
// index also feeds ChatGPT search and Microsoft Copilot.
//
//   npm run indexnow                          every page in the live sitemap
//   npm run indexnow -- services work/skillship   only the pages you name ("home" is /)
//
// Name pages without a leading slash, or as full URLs: Git Bash rewrites "/services"
// into a Windows path before the script sees it.
//
// Run it after a deploy that changes what public pages say. The key below is public by
// design: search engines confirm it by fetching /<key>.txt from the site (public/).

const SITE = "https://www.amfire.in";
const KEY = "db05d8c5d020f64310bb085776b1a78e";

async function main() {
  const args = process.argv.slice(2);
  const mangled = args.filter((a) => /^[A-Za-z]:[\\/]/.test(a));
  if (mangled.length) throw new Error(`These look like Windows paths, not pages: ${mangled.join(", ")}. Leave out the leading slash (services, not /services).`);
  let urls = args.map((a) => (/^https?:\/\//.test(a) ? a : a === "home" || a === "/" ? SITE : `${SITE}/${a.replace(/^\/+/, "")}`));
  if (urls.length === 0) {
    const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  }
  if (urls.length === 0) throw new Error("No URLs to submit: the sitemap was empty.");

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
  });
  // 200 and 202 both mean accepted; 202 means the key is still being checked.
  if (res.status !== 200 && res.status !== 202) throw new Error(`IndexNow answered ${res.status}: ${await res.text()}`);
  console.log(`Submitted ${urls.length} URL(s) to IndexNow (${res.status}).`);
  for (const u of urls) console.log(`  ${u}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
