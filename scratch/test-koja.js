const fs = require('fs');

async function checkKoja() {
  const containerNo = "FSCU5139549";
  const params = new URLSearchParams();
  params.set("CNTR_ID", containerNo);
  params.set("submit", "Show Detail");

  try {
    const response = await fetch(
      "https://www.tpkkoja.co.id/online-consignee-container-tracking/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const html = await response.text();
    fs.writeFileSync('./scratch/koja_test.html', html);
    console.log("HTML saved to scratch/koja_test.html");
  } catch (err) {
    console.error(err);
  }
}

checkKoja();
