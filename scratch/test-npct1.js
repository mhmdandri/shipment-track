const cheerio = require('cheerio');

async function testNpct1() {
  const vesselName = "SIYUHE";
  const voyageNo = "618S";
  const containerNo = "SITU2647138";

  const params = new URLSearchParams();
  params.set("vesselTracking", vesselName);
  params.set("vesselVoyage", voyageNo);
  params.set("vesselDirection", "OUT");
  params.set("vesselContainer", containerNo);

  try {
    const initRes = await fetch("https://www.npct1.co.id/");
    const setCookies = initRes.headers.getSetCookie ? initRes.headers.getSetCookie() : [];
    const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
    const initHtml = await initRes.text();
    const tokenMatch = initHtml.match(/name="csrf-token"\s+content="([^"]+)"/);
    const csrfToken = tokenMatch ? tokenMatch[1] : '';

    params.set("_token", csrfToken);

    const postRes = await fetch("https://www.npct1.co.id/req/container", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": cookieStr,
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: params.toString(),
    });

    const postJson = await postRes.json();
    console.log("POST JSON:", postJson);

    if (postJson.redirect && postJson.redirect.url) {
      const getHtmlRes = await fetch(postJson.redirect.url, {
         method: "GET",
         headers: {
           "Cookie": cookieStr
         }
      });
      const html = await getHtmlRes.text();
      const $ = cheerio.load(html);
      
      const statusText = $(".status-desc .semi-bold").text().trim();
      console.log("STATUS FOUND:", statusText);

      let foundTime = "";
      $("p.hint-text").each((_, el) => {
        if ($(el).text().trim() === "Container In") {
          foundTime = $(el).next("h5").text().trim();
        }
      });
      console.log("TIME FOUND:", foundTime);
      console.log("RAW HTML:", $.html());
    }
  } catch (err) {
    console.error(err);
  }
}

testNpct1();
