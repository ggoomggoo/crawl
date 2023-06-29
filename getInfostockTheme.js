// puppeteer을 가져온다.
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const themePages = [
    'https://m.infostock.co.kr/sector/sector.asp?mode=w',
];

// fs.createReadStream('books.csv')
//   .pipe(csv())
//   .on('data', (data) => books.push(data))
//   .on('end', () => {
//     console.log(books);
//   });

(async() => {
  // 브라우저를 실행한다.
  // 옵션으로 headless모드를 끌 수 있다.
  const browser = await puppeteer.launch({
    headless: false
  });

  // 새로운 페이지를 연다.
  const page = await browser.newPage();
  // 페이지의 크기를 설정한다.
  await page.setViewport({
    width: 1280,
    height: 1024,
  });


  for (const themePage of themePages) {
    themeInfo = await saveThemeInfo(browser, page, themePage);
    console.log(JSON.stringify(themeInfo));
  }

  page.close();
  
//   const fields = ['barcode', 'bookName', 'originalPrice', 'salesPrice', 'userMinSalesPrice', 'userMinSalesPrice1', 'userMinSalesPrice2'];
//   const opts = { fields };

//   try {
//     const parser = new Parser(opts);
//     const csv = parser.parse(result);
//     console.log(csv);
//   } catch (err) {
//     console.error(err);
//   }

  // 브라우저를 종료한다.
  browser.close();
})();

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }

async function saveThemeInfo(browser, page, themePage) {
    console.log(`goto ${themePage}`);

    await page.goto(themePage);
    await delay(1000);

    // // 매물 목록 보기
    // await page.click('#_countContainer > a.btn_option._article');
    // await delay(1000);

    // // 최신순 정렬
    // await page.click('div.select_sorting.select_sorting--sale._sorting > div > a:nth-child(2)');
    // await delay(1000);

    // // 스샷
    // await page.screenshot({ path: `.dist/example-${Date.now()}.png`, fullPage: true });


    // 페이지의 HTML을 가져온다.
    const content = await page.content();
    // $에 cheerio를 로드한다.
    const $ = cheerio.load(content);
    // 특정 영역을 가져온다.
    // const themeALinks = $(".item_area._Listitem");
    // console.log(themeALinks.length);


    // let themeALinks = document.querySelectorAll('#data > table > tbody > tr > td > a')
    let themeALinks = $('#data > table > tbody > tr > td > a')




    // 새로운 페이지를 연다.
    const themeDetailPage = await browser.newPage();
    // 페이지의 크기를 설정한다.
    await themeDetailPage.setViewport({
        width: 1280,
        height: 1024,
    });

    const themeJson = {
      themeCode: {},
      themeName: {},
      themeTickerCodes: {},
    }

    index = -1;
    for (const themeALink of themeALinks) {
      index += 1;

      const $themeALink = $(themeALink)
      const themeName = $themeALink.text()
      const themeHref = $themeALink.attr('href')
      console.log(`${themeName}, ${themeHref}`)
      
      themeCode = themeHref.match(/([\(])(.+)([\)])/)[2].split(',')[1].replaceAll('\'', '')

      await themeDetailPage.goto(`https://m.infostock.co.kr/sector/sector_detail.asp?code=${themeCode}`);
      await themeDetailPage.waitFor(500);

      
      const newPageContent = await themeDetailPage.content();
      // $에 cheerio를 로드한다.
      const $newPageContent = cheerio.load(newPageContent);

      themeTickerCodes = $newPageContent.text().match(/[0-9]{6}/g)


      // themeJson[themeCode] = {
      //   name: themeName,
      //   tickerCodes: tickerCodes,
      // }

      themeJson['themeCode'][index] = themeCode;
      themeJson['themeName'][index] = themeName;
      themeJson['themeTickerCodes'][index] = JSON.stringify(themeTickerCodes);

      console.log(`${themeCode} done. ${themeCode.length}`)
    };

    themeDetailPage.close();

    return themeJson;
}
