console.log("[TB-JOURNAL] gestartet");


async function openJournal() {

  const url =
    browser.runtime.getURL(
      "journal.html"
    );


  const tabs =
    await browser.tabs.query({});


  const existing =
    tabs.find(
      tab => tab.url === url
    );


  if (existing) {

    await browser.tabs.update(
      existing.id,
      {
        active: true
      }
    );

    return;
  }


  await browser.tabs.create({
    url
  });
}


browser.browserAction.onClicked.addListener(
  openJournal
);


browser.commands.onCommand.addListener(
  command => {

    if (command === "open-journal") {
      openJournal();
    }

  }
);
