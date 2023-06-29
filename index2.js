// puppeteer을 가져온다.
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');


const books = [
    'http://info.nec.go.kr/main/showDocument.xhtml?electionId=0020220309&topMenuId=VC&secondMenuId=VCCP09',
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
    width: 800,
    height: 800,
  });


  const result = [];

  for (const book of books) {
    result.push(await saveBookInfo(browser, page, book));
  }
  
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

async function saveBookInfo(browser, page, book) {
    console.log(`book: ${book}`);

    await page.goto(book);
    await delay(2000);

    await page.click('#electionId1');
    await delay(500);

    // const interval = setInterval(
    //   saveFile(),
    //   5000,
    // )

    await saveFile(page);
}

const saveFile = async (page) => {
  await page.click('#spanSubmit');
  await delay(500);

  // 페이지의 HTML을 가져온다.
  const content = await page.content();
  // $에 cheerio를 로드한다.
  const $ = cheerio.load(content);
  // 특정 영역을 가져온다.
  const $contentarea = $("#contentarea");

  var stream = fs.createWriteStream(`.dist/20th-presidential-election-${Date.now()}.html`);
  stream.once('open', function(fd) {
    stream.write($contentarea.html());
    stream.end();
  });
  
  return {};

}