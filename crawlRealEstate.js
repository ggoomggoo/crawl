// puppeteer을 가져온다.
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { sendTelegramMessage, sendTelegramMessageMinor } = require('./telegram');

const timestamp = Date.now();
let maxId = '0';
const previousMaxId = '2327914042'; // manual

const books = [
    'https://m.land.naver.com/map/37.5111:127.0851:14:1171010100/VL:SGJT:OR/B1:B2?wprcMax=22000&rprcMax=50&',
    'https://m.land.naver.com/map/37.502717:127.092513:14:1171010600/VL:SGJT:OR/B1:B2?wprcMax=22000&rprcMax=50&',
    'https://m.land.naver.com/map/37.503592:127.1037:14:1171010500/VL:SGJT:OR/B1:B2?wprcMax=22000&rprcMax=50&',
    'https://m.land.naver.com/map/37.504983:127.11465:14:1171010400/VL:SGJT:OR/B1:B2?wprcMax=22000&rprcMax=50&',
    'https://m.land.naver.com/map/37.51506:127.122999:14:1171011100/VL:SGJT:OR/B1:B2?wprcMax=22000&rprcMax=50&'
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
    width: 360,
    height: 740,
  });


  const result = [];

  sendTelegramMessageAtAll(`${new Date(timestamp).toLocaleString()} start. previousMaxId=${previousMaxId}`);

  let i = 0;
  for (const book of books) {
    i++;
    sendTelegramMessageAtAll(`${new Date(timestamp).toLocaleString()} start. ${i}`);
    result.push(await saveBookInfo(browser, page, book));
  }

  sendTelegramMessageAtAll(`${new Date(timestamp).toLocaleString()} finish. maxId=${maxId}`);

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

async function saveBookInfo(browser, page, book) {
    console.log(`book: ${book}`);

    await page.goto(book);
    await delay(1000);

    // 매물 목록 보기
    await page.click('#_countContainer > a.btn_option._article');
    await delay(1000);

    // 최신순 정렬
    await page.click('div.select_sorting.select_sorting--sale._sorting > div > a:nth-child(2)');
    await delay(1000);

    // 스샷
    await page.screenshot({ path: `.dist/page-${timestamp}-${Date.now()}.png`, fullPage: true });


    // 페이지의 HTML을 가져온다.
    const content = await page.content();
    // $에 cheerio를 로드한다.
    const $ = cheerio.load(content);
    // 특정 영역을 가져온다.
    const items = $(".item_area._Listitem");
    console.log(items.length);

    // 새로운 페이지를 연다.
    const newPage = await browser.newPage();
    // 페이지의 크기를 설정한다.
    await newPage.setViewport({
        width: 480,
        // width: 360,
        height: 1280 * 3,
        // height: 480 * 2,
    });

    // 새로운 페이지를 연다.
    const imagePage = await browser.newPage();
    // 페이지의 크기를 설정한다.
    await imagePage.setViewport({
        width: 480,
        height: 480 * 2,
    });

    let count = 0;
    for (const item of items) {
      count++;

      await page.bringToFront()

      // const $item = cheerio.load(items.get(index));
        const $item = cheerio.load(item);

        // const $itemInnerLink = $item('.item_link._innerLink');
        // const $itemInnerLink = $item('._innerLink');
        let itemInnerLink = $item('._innerLink').attr('href');
        
        const title_area = $item('div.title_area').text();
        const price_area = $item('div.price_area').text();
        const information_area = $item('div.information_area').text();
        const tag_area = $item('div.tag_area').text();
        const cp_area = $item('div.cp_area').text();
        const merit_area = $item('div.merit_area').text();

        const summary = {
          itemInnerLink,
          title_area,
          price_area,
          information_area,
          tag_area,
          cp_area,
          merit_area,
        }

        console.log('============================')
        for (const key in summary) {
          if (Object.hasOwnProperty.call(summary, key)) {
            const value = summary[key];
            console.log(`${key}: ${value}`)
          }
        }

        if (!itemInnerLink) {
          // // TODO
          // await page.click('._moreLink');
          // // 변경된 html 을 다시 로드해서 읽어들여야함
          // itemInnerLink = $item('div.item.item--child._item--child > div:nth-child(1) > a._innerLink');
          const $moreLink = $item('._moreLink');
          const id = $moreLink.attr('_articleno');
          itemInnerLink = `/article/info/${id}`;
          console.warn(`itemInnerLink not founded. ${id} ${summary.title_area} ${summary.price_area} ${summary.information_area}`)
        }

        let t = itemInnerLink.split('/')
        const id = t[t.length - 1]

        // skip already id
        maxId = Math.max(Number(id), Number(maxId)).toString();
        if (Number(id) <= Number(previousMaxId)) {
          console.log(`${id} skip. previousMaxId=${previousMaxId}. merit_area=${merit_area}`)
          continue;
        }

        await newPage.bringToFront()

        // 상세보기
        // await newPage.goto(`https://m.land.naver.com${itemInnerLink}`);
        await newPage.goto(`https://m.land.naver.com/${itemInnerLink}?newMobile`);
        await newPage.waitFor(500);
        
        try {
          await newPage.click('button.detail_description_button');
          await newPage.waitFor(200);
        } catch (error) {
          console.warn(`detail_description_button error: ${error.message}`);
        }

        // 텍스트 크롤링
        const newPageContent = await newPage.content();
        const $newPageContent = cheerio.load(newPageContent);

        // detail_info
        const type_confirm = $newPageContent('#content > div > div.detail_apartment > div.detail_info > div > div.detail_info_important > div.detail_important_summary > div > strong.detail_info_label.type_confirm').text();
        const type_sale = $newPageContent('#content > div > div.detail_apartment > div.detail_info > div > div.detail_info_important > div.detail_important_summary > div > strong.detail_info_label.type_sale').text();
        const date = /\d{2}.\d{2}.\d{2}./.exec($newPageContent('#content > div > div.detail_apartment > div.detail_info > div > div.detail_info_important > div.detail_important_summary > div > strong.detail_info_label').text())[0].replaceAll('.', '');
        
        const detail_sale_title = $newPageContent('.detail_sale_title').text();
        const detail_deal_kind = $newPageContent('.detail_deal_kind').text();
        const detail_deal_price = $newPageContent('.detail_deal_price').text();
        const {detail_deal_price_first, detail_deal_price_second} = splitPrice(detail_deal_price)
        const detail_extent_text = $newPageContent('.detail_extent_text').text();
        const detail_introduction_text = $newPageContent('.detail_introduction_text').text();
        const detail_general_summary = $newPageContent('.detail_general_summary').text();

        // detail_sale
        const detail_sale_table = $newPageContent('.detail_sale_table').text();
        const detail_row_cell_map = {}; // 건축물 용도, 해당층/총층, 방수/욕실수, 공급/전용면적, 관리비, 
        const detail_row_cell_list = $newPageContent('.detail_row_cell');
        for (const detail_row_cell of detail_row_cell_list) {
          const $detail_row_cell = cheerio.load(detail_row_cell);
          const detail_cell_title = $detail_row_cell('.detail_cell_title').text()
          const detail_cell_data = $detail_row_cell('.detail_cell_data').text()
          detail_row_cell_map[detail_cell_title] = detail_cell_data;
        }
        const area = Number(splitArea(detail_row_cell_map['공급/전용면적'] ||detail_row_cell_map['계약/전용면적'] || '00.00/00.00㎡(전용률 00%)'))
        const maintenance_cost = Number(removeNotDigit(detail_row_cell_map['관리비'] || '0.0'))
        // const floor = Number((detail_row_cell_map['해당층/총층'] || '0/0층')[0]) // TODO 저/6층
        const floorText = (detail_row_cell_map['해당층/총층'] || '0/0층') // TODO 저/6층
        const room_count = Number((detail_row_cell_map['방수/욕실수'] || '0/0개')[0]) // TODO 2/1개

        // detail_facilities
        const detail_facilities_item = $newPageContent('.detail_facilities_item').text();
        const detail_facilities_item_map = {}; // 냉장고, 세탁기, 에어컨, 레인지, 베란타, 테라스
        const detail_facilities_item_list = $newPageContent('.detail_facilities_item');
        for (const detail_facilities_item of detail_facilities_item_list) {
          const $detail_facilities_item = cheerio.load(detail_facilities_item);
          const item_name = $detail_facilities_item.text()
          detail_facilities_item_map[item_name] = 1;
        }

        // detail_location
        const detail_location_info = $newPageContent('#content > div > div.detail_apartment > div.detail_location > div.detail_location_info > em.detail_info_branch').text();

        // detail_agent
        const detail_agent_head_title = $newPageContent('.detail_agent .detail_agent_head .detail_head_title').text();
        const detail_head_inner = $newPageContent('.detail_agent .detail_agent_head .detail_head_inner').text();

        // detail_facilities
        // detail_time
        // detail_transport

        const details = {
          summary: {
            ...summary,
          },
          id,
          type_confirm,
          date,
          detail_location_info,
        }

        console.log('============================')
        for (const key in details) {
          if (Object.hasOwnProperty.call(details, key)) {
            const value = details[key];
            console.log(`${key}: ${value}`)
          }
        }

        // skip date
        // if (date < "230629") {
        //   newPage.close();
        //   imagePage.close();
        //   return {};
        // }

        // alarm
        const pArea = (area/3.30579).toFixed(0);
        const aa = (detail_deal_price_second + maintenance_cost) / (4/1000); // not 5/1000
        const price = (detail_deal_price_first + aa);
        const costByArea = (price / pArea).toFixed(0);

        let message = '';
        if (
          (1 == 1)
          // && (floor >= 2)
          && (costByArea < 2_200 ) // over 1_700
          && (detail_deal_price_first > 8_000)
          && (detail_deal_price_first < 22_000)
          && (price < 30_000) // over 22_000
        ) {
          message = '| yureka!!!'; // costByArea
          sendTelegramMessage(
            [`📍 ${detail_location_info} 📍 ${room_count || '-'} 📍 ${pArea} 📍 ${floorText} | ${date}`, `💰 ${price} 💰 ${costByArea} 💰 ${detail_deal_price}`, `ℹ️ ${detail_general_summary}`, `${detail_agent_head_title}`, '', `${id}`, `🔗 https://m.land.naver.com/article/info/${id}?newMobile`, '', `🔗 https://map.naver.com/v5/search/${detail_location_info.split(' ').join('_')}`].join('\n')
          );
        } else {
          sendTelegramMessageMinor(
            [`📍 ${detail_location_info} 📍 ${room_count || '-'} 📍 ${pArea} 📍 ${floorText} | ${date}`, `💰 ${price} 💰 ${costByArea} 💰 ${detail_deal_price}`, `ℹ️ ${detail_general_summary}`, `${detail_agent_head_title}`, '', `${id}`, `🔗 https://m.land.naver.com/article/info/${id}?newMobile`, '', `🔗 https://map.naver.com/v5/search/${detail_location_info.split(' ').join('_')}`].join('\n')
          );
        }

        console.log(`date=${date}, id=${id}, price=${price}, price_first=${detail_deal_price_first}, costByArea=${costByArea} ${message}`)
        
        // skip
        // debugger;
        // continue;

        // 지도 확장
        try {
          await newPage.click('button.detail_control_tool');
          await newPage.waitFor(200);
  
          await newPage.click('button.detail_scale_tool:nth-child(2)');
          await newPage.click('button.detail_scale_tool:nth-child(2)');
          await newPage.waitFor(200);
        } catch (error) {
          console.warn(`detail_control_tool error: ${error.message}`);
        }

        
        // const now = new Date().toISOString()

        // const filePath = `.dist/example-${Date.now()}-${itemInnerLink.replaceAll('/', '_')}`
        const filePath = `.dist/${details.date}-${details.id}-${details.detail_location_info}`

        
        // 캡쳐
        await newPage.screenshot({ path: `${filePath}-${timestamp}.png`, fullPage: true });

        // 캡쳐 - 사진 더 보기
        await imagePage.bringToFront()
        await imagePage.goto(`https://m.land.naver.com/article/image/${id}`);
        await imagePage.waitFor(500);

        await imagePage.screenshot({ path: `${filePath}-images-${timestamp}.png`, fullPage: true });
        await imagePage.waitFor(300);
    };

    newPage.close();
    imagePage.close();

    return {};
}

function sendTelegramMessageAtAll(message) {
  sendTelegramMessage(message);
  sendTelegramMessageMinor(message)
}


function splitPrice(price_text) {
  const raw_list = price_text.split('/');

  let detail_deal_price_first = 0;
  let detail_deal_price_second = 0;

  if (raw_list.length == 1 || raw_list.length == 2) {
    const raw_first = raw_list[0];
    const detail_deal_price_a_list = raw_first.split('억');

    if (detail_deal_price_a_list.length == 1 || detail_deal_price_a_list.length == 2) {
      const detail_deal_price_a_a = detail_deal_price_a_list[0].replaceAll(/\D/g, '');

      // 전세 4000만원
      detail_deal_price_first += Number(detail_deal_price_a_a);

      // 전세 2억
      if (/[억]/.test(raw_first))
      detail_deal_price_first = Number(detail_deal_price_a_a) * 10_000;
    }

    if (detail_deal_price_a_list.length == 2) {
      // 전세 2억 2,000
      const detail_deal_price_a_b = detail_deal_price_a_list[1].replaceAll(/\D/g, '');

      detail_deal_price_first += Number(detail_deal_price_a_b);
    }
  }
  
  if (raw_list.length == 2) {
    // 월세 1억 7,000만원 / 50
    // 월세 500만원 / 38
    detail_deal_price_second = Number(raw_list[1].replaceAll(/\D/g, ''));
  }

  return {
    detail_deal_price_first,
    detail_deal_price_second,
  }
}

function splitArea(string) {
  // '00.00/00.00㎡(전용률 00%)'
  return string.split('㎡')[0].split('/')[1]
}

function removeNotDigit(string) {
  return string.replaceAll(/[^0-9.]/g, '');
}
