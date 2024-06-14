const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const { google } = require('googleapis');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const bodyParser = require('body-parser');
const { main_met } = require('./crawl_metropole');
const { main_met_dorm } = require('./crawl_metropole_dormitory');
const { main_met_bus } = require('./crawl_metropole_bus');
const { main_plan } = require('./crawl_plan');
const { main_met_load } = require('./load_crawl_met');
const { main_met_dorm_load } = require('./load_crawl_met_dorm');
const { main_lecturelist } = require('./load_lecturelist');
const { main_lectureinfo } = require('./load_lectureinfo');
const { type } = require('os');
const app = express();
const port = 8080;
let mealMetropole;
let mealMetropoleDormitory;
let lectureList;
let lectureInfo;
let serverInitialized = false;
app.use(express.json());
app.use(express.static(__dirname));
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = 'credentials.json';
const SPREADSHEET_ID = '1F3kEbduNvPnsIbfdO9gDZzc1yua1LMs627KAwZsYg6o';
let auth_global;
const imagePath = path.join(__dirname, 'images');
if (!fs.existsSync(imagePath)) {
  fs.mkdirSync(imagePath);
}
const imagePath2 = path.join(__dirname, 'images_bus');
if (!fs.existsSync(imagePath2)) {
  fs.mkdirSync(imagePath2);
}
const imagePath3 = path.join(__dirname, 'images_bus_school');
if (!fs.existsSync(imagePath3)) {
  fs.mkdirSync(imagePath3);
}


app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username === 'tlatlsgksp' && password === 'dlxorb127@') {
    res.redirect('/admin.html');
  } else {
    console.log("로그인 실패");
    res.status(401).json({ message: '로그인 실패' });
  }
});



//웹훅
app.post("/webhook", express.json(), async (req, res) => {
  const body = req.body;
  const action = body.queryResult.action;
  const params = body.queryResult.parameters;
  const outputContexts = body.queryResult.outputContexts;
  const session = body.session;
  let clientExtra = null;

  for (let context of outputContexts) {
    if (context.name.endsWith('/contexts/clientExtra')) {
      clientExtra = context.parameters;
      break;
    }
  }

  let response;

  try {
    if (action === 'today') {
      response = meal_today();
    } else if (action === 'tomorrow') {
      response = meal_tomorrow();
    } else if (action === 'dayOfWeek') {
      response = meal_week_met();
    } else if (action === 'dayOfWeek2') {
      response = meal_week_met2();
    } else if (action === 'lecture_now1') {
      response = empty_lecture_now_1();
    } else if (action === 'lecture_now2') {
      response = empty_lecture_now_2();
    } else if (action === 'lecture_now3') {
      response = empty_lecture_now_3();
    } else if (action === 'lecture_next1') {
      response = empty_lecture_next_1();
    } else if (action === 'lecture_next2') {
      response = empty_lecture_next_2();
    } else if (action === 'lecture_next3') {
      response = empty_lecture_next_3();
    } else if (action === 'lecture_info_find') {
      response = await lecture_info_find(params, outputContexts, session);
    } else if (action === 'lecture_info_select') {
      response = await lecture_info_select(params, outputContexts, session);
    } else if (action === 'lecture_info_search') {
      response = await lecture_info_search(params, outputContexts, session);
    } else if (action === 'lecture_professor_find') {
      response = await lecture_professor_find(params, outputContexts, session);
    } else if (action === 'lecture_professor_select') {
      response = await lecture_professor_select(params, outputContexts, session);
    } else if (action === 'lecture_professor_info_find') {
      response = await lecture_professor_info_find(params, outputContexts, session);
    } else if (action === 'lecture_professor_info_select') {
      response = await lecture_professor_info_select(params, outputContexts, session);
    } else if (action === 'lecture_schedule_save') {
      response = await lecture_schedule_save(params, outputContexts, session);
    } else if (action === 'lecture_schedule_edit') {
      response = await lecture_schedule_edit(params, outputContexts, session);
    } else if (action === 'lecture_schedule_delete') {
      response = await lecture_schedule_delete(params, outputContexts, session);
    } else if (action === 'lecture_schedule_print') {
      response = await lecture_schedule_print(session);
    } else if (action === 'buslist_load') {
      response = await buslist_load();
    } else if (action === 'buslist_save') {
      response = await buslist_save(busList);
    } else if (action === 'bus_city') {
      response = await buscity(body, session, outputContexts);  
    } else {
      response = {
        fulfillmentText: "null"
      };
    }

    res.send(response);
  } catch (error) {
    console.error(error);
    res.send({
      fulfillmentText: "예기치 않은 응답입니다."
    });
  }
});

//서버 초기화

async function initialize() {
  try {
    console.log('서버 초기화 중');
    await main_met();
    await main_met_dorm();
    await main_met_bus();
    await main_plan();
    await main_met_load();
    await main_met_dorm_load();
    await main_lecturelist();
    await main_lectureinfo();
    auth_global = await authorize();
    fs.readFile('./crawl_met.json', 'utf8', async (err, data) => {
      if (err) throw err;
      mealMetropole = await JSON.parse(data);
    });
    fs.readFile('./crawl_met_dorm.json', 'utf8', async (err, data) => {
      if (err) throw err;
      mealMetropoleDormitory = await JSON.parse(data);
    });
    fs.readFile('./lecturelist.json', 'utf8', async (err, data) => {
      if (err) throw err;
      lectureList = await JSON.parse(data);
    });
    fs.readFile('./lectureinfo.json', 'utf8', async (err, data) => {
      if (err) throw err;
      lectureInfo = await JSON.parse(data);
    });
    console.log('서버 초기화 완료');
    serverInitialized = true;
  } catch (error) {
    console.error('Error during initialization:', error.message);
  }
}
initialize();

//서버 대기
app.use((req, res, next) => {
  if (!serverInitialized) {
    const response = {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "textCard": {
              "title": "서버 초기화 중입니다.",
              "description": "잠시 후 다시 시도해주세요.",
            }
          }
        ]
      }
    }
    res.json(response);
    return;
  }
  next();
});

//서버 재시작
app.post('/restart', (req, res) => {
  serverInitialized = false;
  initialize();
  console.log('서버 재시작');
});

//서버 종료
app.post('/shutdown', (req, res) => {
  console.log('서버를 종료합니다.');

  // 프로세스 종료
  process.exit();
});

//서버 업데이트
app.post('/update', async (req, res) => {
  try {
    serverInitialized = false;
    await main_met_bus();
    await main_plan();
    await main_met_load();
    await main_met_dorm_load();
    await main_lecturelist();
    await main_lectureinfo();
    fs.readFile('./crawl_met.json', 'utf8', async (err, data) => {
      if (err) throw err;
      mealMetropole = await JSON.parse(data);
    });
    fs.readFile('./crawl_met_dorm.json', 'utf8', async (err, data) => {
      if (err) throw err;
      mealMetropoleDormitory = await JSON.parse(data);
    });
    fs.readFile('./lecturelist.json', 'utf8', async (err, data) => {
      if (err) throw err;
      lectureList = await JSON.parse(data);
    });
    fs.readFile('./lectureinfo.json', 'utf8', async (err, data) => {
      if (err) throw err;
      lectureInfo = await JSON.parse(data);
    });
    console.log('서버 업데이트 완료');
    serverInitialized = true;
  } catch (error) {
    console.error('Error during update:', error.message);
    res.status(500).json({ error: '업데이트 중 오류가 발생했습니다.' });
  }
});

//스케줄러
const mondaySchedule = schedule.scheduleJob({ dayOfWeek: 0, hour: 10, minute: 0 }, async function () {
  try {
    console.log('크롤링 스케줄 실행 중');
    await main_met();
    await main_met_dorm();
    await main_met_bus();
    await main_plan();
    await main_met_load();
    await main_met_dorm_load();
    await main_lecturelist();
    await main_lectureinfo();
    fs.readFile('./crawl_met.json', 'utf8', async (err, data) => {
      if (err) throw err;
      mealMetropole = await JSON.parse(data);
    });
    fs.readFile('./crawl_met_dorm.json', 'utf8', async (err, data) => {
      if (err) throw err;
      mealMetropoleDormitory = await JSON.parse(data);
    });
    fs.readFile('./lecturelist.json', 'utf8', async (err, data) => {
      if (err) throw err;
      lectureList = await JSON.parse(data);
    });
    fs.readFile('./lectureinfo.json', 'utf8', async (err, data) => {
      if (err) throw err;
      lectureInfo = await JSON.parse(data);
    });
    console.log('크롤링 스케줄 완료');
  } catch (error) {
    console.error('Error in schedule:', error.message);
  }
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagePath2);
  },
  filename: function (req, file, cb) {
    cb(null, `${file.originalname}`);
  }
});

const upload = multer({ storage: storage }).single('image');

app.post('/upload_image', (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Upload failed', error: err });
    } else if (err) {
      return res.status(500).json({ message: 'Internal server error', error: err });
    }

    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const busNo = req.body.busNo || 'default';
    const newFileName = `${busNo}.png`;

    // 파일 이름 변경
    fs.renameSync(`images_bus/${req.file.originalname}`, `images_bus/${newFileName}`);

    const imageUrl = `http://35.216.59.180:8080/images_bus/${newFileName}`;
    res.status(200).json({ imageUrl });
  });
});

// Google Sheets API 인증 정보 가져오기
async function authorize() {
  const credentials = JSON.parse(await fs.promises.readFile(CREDENTIALS_PATH));
  const { client_email, private_key } = credentials;

  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: SCOPES,
  });

  return auth;
}

// Google Sheets에서 데이터 읽기
async function readFromGoogleSheets(auth, spreadsheetId, range) {
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });

    const values = response.data.values;
    return values;
  } catch (error) {
    console.error('Error reading data from Google Sheets:', error.message);
    return null;
  }
}

// Google Sheets에 데이터 쓰기
async function writeToGoogleSheets(auth, spreadsheetId, range, data) {
  const sheets = google.sheets({ version: 'v4', auth });

  // 기존 데이터를 지우기 위한 clearValues 요청
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  const resource = {
    values: data.slice(1),
  };

  // 새로운 데이터를 업데이트하기 위한 update 요청
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    resource,
  });
}

async function batchWriteToGoogleSheets(auth, spreadsheetId, ranges, data) {
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const resource = {
      valueInputOption: 'RAW',
      data: ranges.map((range, index) => ({
        range: range,
        majorDimension: 'ROWS',
        values: [data[index]]
      }))
    };

    sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: resource
    });
  } catch (error) {
    console.error('Error writing data to Google Sheets:', error.message);
  }
}

async function deleteToGoogleSheets(auth, spreadsheetId, range, data) {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });

    const rows = response.data.values;
    if (rows.length === 0) {
      console.log('No data found.');
      return;
    } else {
      const newData = rows.map(row => row.map(cell => cell === data ? "" : cell));

      // 데이터를 지정된 범위에 업데이트
      const updateResponse = sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: { values: newData },
      });

    }
  } catch (err) {
    console.error('The API returned an error: ' + err);
    throw err;
  }
}

async function getScheduleData(auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: '시간표!A1:BS', // 시간표 시트의 전체 범위
  });
  const rows = response.data.values;

  // 헤더 행을 기준으로 userId와 시간표 데이터를 추출하여 객체에 저장
  const headerRow = rows.shift(); // 헤더 행 추출
  const scheduleData = {};

  rows.forEach(row => {
    const userId = row[0]; // 첫 번째 열은 userId
    const timetable = [];
    // 헤더 행의 내용을 기준으로 시간표 데이터를 추출하여 timetable 배열에 저장
    headerRow.forEach((header, index) => {
      if (index > 0 && index < row.length) {
        timetable.push({ [header]: row[index] });
      }
    });

    // userId를 키로, timetable을 값으로 하는 객체를 scheduleData에 추가
    scheduleData[userId] = timetable;
  });

  return scheduleData;
}

async function getBusData(auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: '버스!A2:B',
  });
  const rows = response.data.values;
  const buslistData = [];
  if (rows && rows.length) {
    rows.forEach(row => {
      const bus_no = row[0];
      const bus_url = row[1];
      buslistData.push({ bus_no, bus_url });
    });
  }
  return buslistData;
}

// 사용자 ID로 시트에서 해당 행을 찾는 함수
async function findUserRow(userId, auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '시간표!A:A', // userId가 있는 열 범위
  });
  const rows = response.data.values;
  if (rows) {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        return i + 1; // 행 인덱스는 1부터 시작하므로 +1
      }
    }
  }
  return null; // 사용자의 행을 찾지 못한 경우
}

async function addUserRow(userId, auth, spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: '시간표!A:A', // userId가 있는 열 범위
    valueInputOption: 'RAW',
    resource: { values: [[userId]] },
  });
  return response.data.updates.updatedRange.split('A')[1]; // 사용자의 행 번호 반환
}

// 시간표의 시간 문자열을 이용하여 열 인덱스를 계산하는 함수
function getTimeIndex(time) {
  const indices = [];

  if (time.includes('),')) {
    const periods = time.split('),');

    periods.forEach(period => {
      const [day, hourString] = period.split('(');
      const hours = hourString.replace(')', '').split(',');

      hours.forEach(hour => {
        const formattedDay = day + '(' + hour + ')';
        indices.push(formattedDay);
      });
    });
  } else if (time.length > 4) {
    const [day, hourString] = time.split('(');
    const hours = hourString.replace(')', '').split(',');

    hours.forEach(hour => {
      const formattedDay = day + '(' + hour + ')';
      indices.push(formattedDay);
    });
  } else {
    indices.push(time);
  }

  return indices;
}

function getColumnIndex(timeIndices) {
  const result = [];
  const Array1 = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',];
  const Array2 = ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC'];
  const Array3 = ['AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ'];
  const Array4 = ['AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC', 'BD', 'BE'];
  const Array5 = ['BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR', 'BS'];

  for (const index of timeIndices) {
    let letter;
    const day = index.split('(')[0];
    const num = parseInt(index.split('(')[1]);

    if (num < 1 || num > 15) {
      throw new Error('Invalid index');
    }

    switch (day) {
      case '월':
        letter = Array1[num - 1];
        break;
      case '화':
        letter = Array2[num - 1];
        break;
      case '수':
        letter = Array3[num - 1];
        break;
      case '목':
        letter = Array4[num - 1];
        break;
      case '금':
        letter = Array5[num - 1];
        break;
      default:
        throw new Error('Invalid day');
    }

    result.push(letter);
  }

  return result;
}

//함수
//요일 환산
function gettoDay() {
  const offset = 1000 * 60 * 60 * 9
  const KST = new Date((new Date()).getTime() + offset)
  const today = KST.getDay();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[today];
}

//수업 교시 환산
function getCurrentClass() {
  const now = new Date();

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const classTimes = [
    { start: 8, end: 9, minute: 30 },
    { start: 9, end: 10, minute: 30 },
    { start: 10, end: 11, minute: 30 },
    { start: 11, end: 12, minute: 30 },
    { start: 12, end: 13, minute: 30 },
    { start: 13, end: 14, minute: 30 },
    { start: 14, end: 15, minute: 30 },
    { start: 15, end: 16, minute: 30 },
    { start: 16, end: 17, minute: 30 },
    { start: 17, end: 18, minute: 30 },
    { start: 18, end: 19, minute: 30 },
    { start: 19, end: 20, minute: 30 },
    { start: 20, end: 21, minute: 30 },
    { start: 21, end: 22, minute: 30 },
    { start: 22, end: 23, minute: 30 }
  ];

  for (let i = 0; i < classTimes.length; i++) {
    const classTime = classTimes[i];
    if (
      (currentHour === classTime.start && currentMinute >= classTime.minute) ||
      (currentHour > classTime.start && currentHour < classTime.end) ||
      (currentHour === classTime.end && currentMinute <= classTime.minute)
    ) {
      return i;
    }
  }

  return null;
}

function findUniqElem(arr1, arr2) {
  return arr1.filter(x => !arr2.includes(x));
}

//현재 빈 강의실 추출
function findAvailableClassrooms(lectureList) {
  const today = gettoDay();
  const currentClass = getCurrentClass();
  const availableClassrooms = [];
  const unavailableClassrooms = [];

  for (const lectureKey in lectureList) {
    const lecture = lectureList[lectureKey];

    if (lecture.hasOwnProperty("시간표") && lecture.hasOwnProperty("캠퍼스")) {
      const classTime = lecture["시간표"];

      if (classTime !== "" && classTime.includes(today) && currentClass && !classTime.includes(currentClass.toString()) && lecture["캠퍼스"] === "메트로폴") {
        availableClassrooms.push(lecture["강의실"]);
      } else if (classTime !== "" && classTime.includes(today) && currentClass && classTime.includes(currentClass.toString()) && lecture["캠퍼스"] === "메트로폴") {
        unavailableClassrooms.push(lecture["강의실"]);
      }
    }
    else {
      console.log("Lecture does not have '시간표' or '캠퍼스' property:");
    }
  }

  return findUniqElem(availableClassrooms, unavailableClassrooms);
}

//다음 교시 빈 강의실 추출
function findAvailableClassroomsNext(lectureList) {
  const today = gettoDay();
  const nextClass = getCurrentClass() + 1;
  const availableClassrooms = [];
  const unavailableClassrooms = [];

  for (const lectureKey in lectureList) {
    const lecture = lectureList[lectureKey];

    if (lecture.hasOwnProperty("시간표")) {
      const classTime = lecture["시간표"];

      if (classTime !== "" && classTime.includes(today) && nextClass && !classTime.includes(nextClass.toString()) && lecture["캠퍼스"] === "메트로폴") {
        availableClassrooms.push(lecture["강의실"]);
      } else if (classTime !== "" && classTime.includes(today) && nextClass && classTime.includes(nextClass.toString()) && lecture["캠퍼스"] === "메트로폴") {
        unavailableClassrooms.push(lecture["강의실"]);
      }
    }
    else {
      console.log("Lecture does not have '시간표' property:");
    }
  }

  return findUniqElem(availableClassrooms, unavailableClassrooms);
}

//층수 기입
function getFloorName(floorCode) {
  switch (floorCode) {
    case '1':
      return '1층';
    case '2':
      return '2층';
    case '3':
      return '3층';
    case '4':
      return '4층';
    case '5':
      return '5층';
    case '6':
      return '6층';
    case '7':
      return '7층';
    case '8':
      return '8층';
    case '9':
      return '9층';
    case '0':
      return '10층';
    default:
      return `Unknown Floor ${floorCode}`;
  }
}

function getCurrentFloor(classroom) {
  const floorCode = classroom.slice(1, 2);
  return getFloorName(floorCode);
}

//현재 우당관 템플릿
function createBuildingResponse_1(buildingName, buildingCode, floors, hasCarousel) {
  const currentClass = getCurrentClass();
  const items = [];
  for (const [floor, classrooms] of Object.entries(floors)) {
    if (classrooms.length > 0) {
      // 중복 제거
      const uniqueClassrooms = removeDuplicates(classrooms);

      const item = {
        type: "description",
        title: `🕒현재 빈 강의실[${buildingName} ${getFloorLabel(floor)}]🕒`,
        text: [`${getFloorLabel(floor)}▼\n(${uniqueClassrooms.join(', ')})\n※${currentClass}교시 기준※`]
      };
      items.push(item);
    }
  }

  const response = {
    "fulfillment_messages": [
      {
        "payload": {
          "richContent":
            items.map(item => [item])
        }
      },
      {
        "payload": {
          "richContent": [
            [
              {
                "type": "chips",
                "options": [
                  {
                    "text": "홈으로",
                    "event": {
                      "name": "main",
                      "parameters": {},
                      "languageCode": "string"
                    }
                  }
                ]
              }
            ]
          ]
        }
      }
    ]
  };

  return response;
}


//현재 선덕관 템플릿

function createBuildingResponse_2(buildingName, buildingCode, floors, hasCarousel) {
  const currentClass = getCurrentClass();
  const items = [];

  for (const [floor, classrooms] of Object.entries(floors)) {
    if (classrooms.length > 0) {
      // 중복 제거
      const uniqueClassrooms = removeDuplicates(classrooms);

      const item = {
        type: "description",
        title: `🕒현재 빈 강의실[${buildingName} ${getFloorLabel(floor)}]🕒`,
        text: [`${getFloorLabel(floor)}▼\n(${uniqueClassrooms.join(', ')})\n※${currentClass}교시 기준※`]
      };
      items.push(item);
    }
  }

  const response = {
    "fulfillment_messages": [
      {
        "payload": {
          "richContent":
            items.map(item => [item])
        }
      },
      {
        "payload": {
          "richContent": [
            [
              {
                "type": "chips",
                "options": [
                  {
                    "text": "홈으로",
                    "event": {
                      "name": "main",
                      "parameters": {},
                      "languageCode": "string"
                    }
                  }
                ]
              }
            ]
          ]
        }
      }
    ]
  };

  return response;
}


//현재 충효관 템플릿

function createBuildingResponse_3(buildingName, buildingCode, floors, hasCarousel) {
  const currentClass = getCurrentClass();
  const items = [];

  for (const [floor, classrooms] of Object.entries(floors)) {
    if (classrooms.length > 0) {
      // 중복 제거
      const uniqueClassrooms = removeDuplicates(classrooms);

      const item = {
        type: "description",
        title: `🕒현재 빈 강의실[${buildingName} ${getFloorLabel(floor)}]🕒`,
        text: [`${getFloorLabel(floor)}▼\n(${uniqueClassrooms.join(', ')})\n※${currentClass}교시 기준※`]
      };
      items.push(item);
    }
  }

  const response = {
    "fulfillment_messages": [
      {
        "payload": {
          "richContent":
            items.map(item => [item])
        }
      },
      {
        "payload": {
          "richContent": [
            [
              {
                "type": "chips",
                "options": [
                  {
                    "text": "홈으로",
                    "event": {
                      "name": "main",
                      "parameters": {},
                      "languageCode": "string"
                    }
                  }
                ]
              }
            ]
          ]
        }
      }
    ]
  };

  return response;
}


//다음 교시 우당관 템플릿

function createBuildingResponseNext_1(buildingName, buildingCode, floors, hasCarousel) {
  const nextClass = getCurrentClass() + 1;
  const items = [];

  for (const [floor, classrooms] of Object.entries(floors)) {
    if (classrooms.length > 0) {
      // 중복 제거
      const uniqueClassrooms = removeDuplicates(classrooms);

      const item = {
        type: "description",
        title: `🕒다음 교시 빈 강의실[${buildingName} ${getFloorLabel(floor)}]🕒`,
        text: [`${getFloorLabel(floor)}▼\n(${uniqueClassrooms.join(', ')})\n※${nextClass}교시 기준※`]
      };
      items.push(item);
    }
  }
  const response = {
    "fulfillment_messages": [
      {
        "payload": {
          "richContent":
            items.map(item => [item])
        }
      },
      {
        "payload": {
          "richContent": [
            [
              {
                "type": "chips",
                "options": [
                  {
                    "text": "홈으로",
                    "event": {
                      "name": "main",
                      "parameters": {},
                      "languageCode": "string"
                    }
                  }
                ]
              }
            ]
          ]
        }
      }
    ]
  };

  return response;
}


//다음 교시 선덕관 템플릿

function createBuildingResponseNext_2(buildingName, buildingCode, floors, hasCarousel) {
  const nextClass = getCurrentClass() + 1;
  const items = [];

  for (const [floor, classrooms] of Object.entries(floors)) {
    if (classrooms.length > 0) {
      // 중복 제거
      const uniqueClassrooms = removeDuplicates(classrooms);

      const item = {
        type: "description",
        title: `🕒다음 교시 빈 강의실[${buildingName} ${getFloorLabel(floor)}]🕒`,
        text: [`${getFloorLabel(floor)}▼\n(${uniqueClassrooms.join(', ')})\n※${nextClass}교시 기준※`]
      };
      items.push(item);
    }
  }

  const response = {
    "fulfillment_messages": [
      {
        "payload": {
          "richContent":
            items.map(item => [item])
        }
      },
      {
        "payload": {
          "richContent": [
            [
              {
                "type": "chips",
                "options": [
                  {
                    "text": "홈으로",
                    "event": {
                      "name": "main",
                      "parameters": {},
                      "languageCode": "string"
                    }
                  }
                ]
              }
            ]
          ]
        }
      }
    ]
  };

  return response;
}


//다음 교시 충효관 템플릿

function createBuildingResponseNext_3(buildingName, buildingCode, floors, hasCarousel) {
  const nextClass = getCurrentClass() + 1;
  const items = [];

  for (const [floor, classrooms] of Object.entries(floors)) {
    if (classrooms.length > 0) {
      // 중복 제거
      const uniqueClassrooms = removeDuplicates(classrooms);

      const item = {
        type: "description",
        title: `🕒다음 교시 빈 강의실[${buildingName} ${getFloorLabel(floor)}]🕒`,
        text: [`${getFloorLabel(floor)}▼\n(${uniqueClassrooms.join(', ')})\n※${nextClass}교시 기준※`]
      };
      items.push(item);
    }
  }

  const response = {
    "fulfillment_messages": [
      {
        "payload": {
          "richContent":
            items.map(item => [item])
        }
      },
      {
        "payload": {
          "richContent": [
            [
              {
                "type": "chips",
                "options": [
                  {
                    "text": "홈으로",
                    "event": {
                      "name": "main",
                      "parameters": {},
                      "languageCode": "string"
                    }
                  }
                ]
              }
            ]
          ]
        }
      }
    ]
  };

  return response;
}



function getFloorLabel(floor) {
  return `${floor}`;
}

//층 정렬
function sortFloors(floors) {
  const sortedFloors = {};
  Object.keys(floors).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
    sortedFloors[key] = floors[key].sort();
  });
  return sortedFloors;
}

//중복 제거
function removeDuplicates(arr) {
  return [...new Set(arr)];
}

function removeDuplicatesAndEmpty(data) {
  const uniqueData = Array.from(new Set(data));
  const filteredData = uniqueData.filter(row => row.trim() !== "");
  return filteredData;
}

function findSimilarLectures(userInput, lectureInfo) {
  if (userInput) {
    const userInputProcessed = userInput.replace(/\s+/g, '').toUpperCase();
    const similarLectures = lectureInfo.filter(item => {
      const subjectWithoutSpaces = item.과목명.replace(/\s+/g, '').toUpperCase();
      return subjectWithoutSpaces.includes(userInputProcessed);
    });
    return similarLectures;
  }
}

function findSimilarProfessors(userInput, lectureInfo) {
  if (userInput) {
    const userInputProcessed = userInput.replace(/\s+/g, '').toUpperCase();
    let similarProfessors = lectureInfo.filter(item => {
      const subjectWithoutSpaces = item.교수명.replace(/\s+/g, '').toUpperCase();
      return subjectWithoutSpaces.includes(userInputProcessed);
    });

    similarProfessors = similarProfessors.filter((prof, index, self) =>
      index === self.findIndex(p => p.교수명 === prof.교수명)
    );

    return similarProfessors;
  }
}

function findSimilarProfessorsNofilter(userInput, lectureInfo) {
  if (userInput) {
    const userInputProcessed = userInput.replace(/\s+/g, '').toUpperCase();
    const similarProfessors = lectureInfo.filter(item => {
      const subjectWithoutSpaces = item.교수명.replace(/\s+/g, '').toUpperCase();
      return subjectWithoutSpaces.includes(userInputProcessed);
    });

    return similarProfessors;
  }
}

// 오늘의 학식,원산지

function meal_today() {
  try {
    const now = new Date();
    const today = now.getDay();
    const daysOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const targetDay = daysOfWeek[today];
    const todayMealMetropole = mealMetropole.data.find(item => item.date === targetDay);
    const todayMealMetropoleDormitory = mealMetropoleDormitory.data.find(item => item.date === targetDay);
    let response;

    console.log(`현재 요일: ${targetDay}`);


    if (today === 6 || today === 0) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗오늘은 주말입니다.❗",
                  "text": "학식이 제공되지 않습니다."
                }
              ]
            ]
          }
        }]
      };
    } else {
      // 문자열로 변환 후 replace 메서드를 사용
      const mealMetropoleText = (todayMealMetropole.meal || '').replace(/\n/g, '<br>');
      const originMetropoleText = (todayMealMetropole.origin || '').replace(/\n/g, '<br>');
      const breakfastDormitoryText = (todayMealMetropoleDormitory.breakfast || '').replace(/\n/g, '<br>');
      const dinnerDormitoryText = (todayMealMetropoleDormitory.dinner || '').replace(/\n/g, '<br>');
      const originDormitoryText = (todayMealMetropoleDormitory.origin || '').replace(/\n/g, '<br>');

      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "accordion",
                  "title": "🍴오늘의 학식[학생식당]🍴",
                  "text": `한정식▼<br>${mealMetropoleText} <br><br>원산지▼<br>${originMetropoleText}`
                },
                {
                  "type": "accordion",
                  "title": "🍴오늘의 학식[기숙사]🍴",
                  "text": `조식▼<br>${breakfastDormitoryText}<br><br>석식▼<br>${dinnerDormitoryText}<br><br>원산지▼<br>${originDormitoryText}`
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      };
    }

    return response;
  } catch (error) {
    console.log(error);
    return {
      fulfillmentText: '예기치 않은 응답입니다.'
    };
  }
}


// 내일의 학식,원산지


function meal_tomorrow() {
  try {
    const now = new Date();
    const today = now.getDay(); 
    now.setDate(now.getDate() + 1);
    const tomorrow = now.getDay();
    const daysOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const targetDay = daysOfWeek[tomorrow];
    const tomorrowMealMetropole = mealMetropole.data.find(item => item.date === targetDay);
    const tomorrowMealMetropoleDormitory = mealMetropoleDormitory.data.find(item => item.date === targetDay);
    let response;

    if (tomorrow === 0 || tomorrow === 6) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗내일은 주말입니다.❗",
                  "text": "학식이 제공되지 않습니다.",
                },
              ]
            ]
          }
        }]
      };
    } else {
      // 문자열로 변환 후 replace 메서드를 사용
      const mealMetropoleText = (tomorrowMealMetropole.meal || '').replace(/\n/g, '<br>');
      const originMetropoleText = (tomorrowMealMetropole.origin || '').replace(/\n/g, '<br>');
      const breakfastDormitoryText = (tomorrowMealMetropoleDormitory.breakfast || '').replace(/\n/g, '<br>');
      const dinnerDormitoryText = (tomorrowMealMetropoleDormitory.dinner || '').replace(/\n/g, '<br>');
      const originDormitoryText = (tomorrowMealMetropoleDormitory.origin || '').replace(/\n/g, '<br>');

      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "accordion",
                  "title": "🍴내일의 학식[학생식당]🍴",
                  "text": `한정식▼<br>${mealMetropoleText} <br><br>원산지▼<br>${originMetropoleText}`
                },
                {
                  "type": "accordion",
                  "title": "🍴내일의 학식[기숙사]🍴",
                  "text": `조식▼<br>${breakfastDormitoryText}<br><br>석식▼<br>${dinnerDormitoryText}<br><br>원산지▼<br>${originDormitoryText}`
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      };
    }

    return response;
  } catch (error) {
    console.log(error);
    return {
      fulfillmentText: '예기치 않은 응답입니다.'
    };
  }
}


//이번주 학식 학생식당


function meal_week_met2() {
  try {
    const daysOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

    const weekMeals = [];
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = daysOfWeek[i];
      const todayMealMetropole = mealMetropole.data.find(item => item.date === dayOfWeek);
      const todayMealMetropoleDormitory = mealMetropoleDormitory.data.find(item => item.date === dayOfWeek);

      if (i === 0 || i === 6) {
        continue;
      }

      weekMeals.push({
        "type": "accordion",
        "title": `🍴${dayOfWeek} 학식[학생식당]🍴`,
        "text": `한정식▼<br>${todayMealMetropole.meal ? `${todayMealMetropole.meal.replace(/\n/g, '<br>')}<br><br>` : '<br><br>'}` + `원산지▼<br>${todayMealMetropole.origin ? `${todayMealMetropole.origin.replace(/\n/g, '<br>')}<br><br>` : ''}`,
      });
    }

    const chips = {
      "type": "chips",
      "options": [
        {
          "event": {
            "languageCode": "string",
            "parameters": {},
            "name": "main"
          },
          "text": "홈으로"
        }
      ]
    };
    weekMeals.push(chips);

    return {
      "fulfillmentMessages": [
        {
          "payload": {
            "richContent": [weekMeals]
          }
        }
      ]
    };
  } catch (error) {
    console.log(error);
    return {
      "fulfillmentText": "예기치 않은 응답입니다."
    };
  }
}

//이번주 학식 기숙사식당


function meal_week_met() {
  try {
    const daysOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

    const weekMeals = [];
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = daysOfWeek[i];
      const todayMealMetropole = mealMetropole.data.find(item => item.date === dayOfWeek);
      const todayMealMetropoleDormitory = mealMetropoleDormitory.data.find(item => item.date === dayOfWeek);

      if (i === 0 || i === 6 || i === 5) {
        continue;
      }

      weekMeals.push({
        "type": "accordion",
        "title": `🍴${dayOfWeek} 학식[기숙사식당]🍴`,
        "text": `조식▼<br>${todayMealMetropoleDormitory.breakfast ? `${todayMealMetropoleDormitory.breakfast.replace(/\n/g, '<br>')}<br><br>` : ''}석식▼<br>${todayMealMetropoleDormitory.dinner ? `${todayMealMetropoleDormitory.dinner.replace(/\n/g, '<br>')}<br><br>` : '<br><br>'}` + `원산지▼<br>${todayMealMetropoleDormitory.origin ? `${todayMealMetropoleDormitory.origin.replace(/\n/g, '<br>')}<br><br>` : ''}`,
      });
    }

    const chips = {
      "type": "chips",
      "options": [
        {
          "event": {
            "languageCode": "string",
            "parameters": {},
            "name": "main"
          },
          "text": "홈으로"
        }
      ]
    };
    weekMeals.push(chips);

    return {
      "fulfillmentMessages": [
        {
          "payload": {
            "richContent": [weekMeals]
          }
        }
      ]
    };
  } catch (error) {
    console.log(error);
    return {
      "fulfillmentText": "예기치 않은 응답입니다."
    };
  }
}


//현재 빈 강의실 - 우당관
function empty_lecture_now_1() {
  try {
    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isClassTime = currentHour > 9 || (currentHour === 9 && currentMinute >= 30) && (currentHour < 23 || (currentHour === 23 && currentMinute <= 30));
    let response;

    console.log(`현재 시간 (로컬 시간): ${now}`);

    if (today === 6 || today === 0) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗오늘은 주말입니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else if (!isClassTime) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗수업시간이 아닙니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else {
      const empty = findAvailableClassrooms(lectureList);

      const buildingCode = '1';
      const floors = {
        '1': [], '2': [], '3': [], '4': [], '5': [],
        '6': [], '7': [], '8': [], '9': [], '0': [],
      };

      empty.forEach(classroom => {
        const currentBuildingCode = classroom.charAt(0);
        const floorName = getCurrentFloor(classroom);

        if (currentBuildingCode === buildingCode) {
          if (!floors[floorName]) {
            floors[floorName] = [];
          }

          floors[floorName].push(classroom);
        }
      });

      const sortedFloors = sortFloors(floors);

      response = createBuildingResponse_1('우당관', buildingCode, sortedFloors, false);
    }
    return response;
  } catch (error) {
    console.log(error);
    response = {
      "fulfillmentText": "예기치 않은 응답입니다.",
      "type": "chips",
      "options": [
        {
          "event": {
            "languageCode": "string",
            "parameters": {},
            "name": "main"
          },
          "text": "홈으로"
        }
      ]
    }
    return response;
  }
}





//현재 빈 강의실 - 선덕관
function empty_lecture_now_2() {
  try {
    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isClassTime = currentHour > 9 || (currentHour === 9 && currentMinute >= 30) && (currentHour < 23 || (currentHour === 23 && currentMinute <= 30));
    let response;

    if (today === 6 || today === 0) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗오늘은 주말입니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else if (!isClassTime) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗수업시간이 아닙니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else {
      const empty = findAvailableClassrooms(lectureList);

      const buildingCode = '2';
      const floors = {
        '1': [], '2': [], '3': [], '4': [], '5': [],
        '6': [], '7': [], '8': [], '9': [], '0': [],
      };

      empty.forEach(classroom => {
        const currentBuildingCode = classroom.charAt(0);
        const floorName = getCurrentFloor(classroom);

        if (currentBuildingCode === buildingCode) {
          if (!floors[floorName]) {
            floors[floorName] = [];
          }

          floors[floorName].push(classroom);
        }
      });

      const sortedFloors = sortFloors(floors);

      response = createBuildingResponse_2('선덕관', buildingCode, sortedFloors, false);
    }
    return response;
  } catch (error) {
    console.log(error);
    response = {
      "fulfillmentText": "예기치 않은 응답입니다.",
      "type": "chips",
      "options": [
        {
          "event": {
            "languageCode": "string",
            "parameters": {},
            "name": "main"
          },
          "text": "홈으로"
        }
      ]
    }
    return response;
  }
}


//현재 빈 강의실 - 충효관
function empty_lecture_now_3() {
  try {
    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isClassTime = currentHour > 9 || (currentHour === 9 && currentMinute >= 30) && (currentHour < 23 || (currentHour === 23 && currentMinute <= 30));
    let response;


    if (today === 6 || today === 0) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗오늘은 주말입니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else if (!isClassTime) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗수업시간이 아닙니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else {
      const empty = findAvailableClassrooms(lectureList);

      const buildingCode = '3';
      const floors = {
        '1': [], '2': [], '3': [], '4': [], '5': [],
        '6': [], '7': [], '8': [], '9': [], '0': [],
      };

      empty.forEach(classroom => {
        const currentBuildingCode = classroom.charAt(0);
        const floorName = getCurrentFloor(classroom);

        if (currentBuildingCode === buildingCode) {
          if (!floors[floorName]) {
            floors[floorName] = [];
          }

          floors[floorName].push(classroom);
        }
      });

      const sortedFloors = sortFloors(floors);

      response = createBuildingResponse_3('충효관', buildingCode, sortedFloors, false);
    }
    return response;
  } catch (error) {
    console.log(error);
    response = {
      "fulfillmentText": "예기치 않은 응답입니다.",
      "type": "chips",
      "options": [
        {
          "event": {
            "languageCode": "string",
            "parameters": {},
            "name": "main"
          },
          "text": "홈으로"
        }
      ]
    }
    return response;
  }
}




//다음 교시 빈 강의실 - 우당관
function empty_lecture_next_1() {
  try {
    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isClassTime = currentHour > 9 || (currentHour === 9 && currentMinute >= 30) && (currentHour < 23 || (currentHour === 23 && currentMinute <= 30));
    let response;


    if (today === 6 || today === 0) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗오늘은 주말입니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else if (!isClassTime) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗수업시간이 아닙니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else {
      const empty = findAvailableClassroomsNext(lectureList);

      const buildingCode = '1';
      const floors = {
        '1': [], '2': [], '3': [], '4': [], '5': [],
        '6': [], '7': [], '8': [], '9': [], '0': [],
      };

      empty.forEach(classroom => {
        const currentBuildingCode = classroom.charAt(0);
        const floorName = getCurrentFloor(classroom);

        if (currentBuildingCode === buildingCode) {
          if (!floors[floorName]) {
            floors[floorName] = [];
          }

          floors[floorName].push(classroom);
        }
      });

      const sortedFloors = sortFloors(floors);

      response = createBuildingResponseNext_1('우당관', buildingCode, sortedFloors, false);
    }
    return response;
  } catch (error) {
    console.log(error)
    response = {
      "fulfillmentText": "예기치 않은 응답입니다.",
      "type": "chips",
      "options": [
        {
          "event": {
            "languageCode": "string",
            "parameters": {},
            "name": "main"
          },
          "text": "홈으로"
        }
      ]
    }
    return response;
  }
};


//다음 교시 빈 강의실 - 선덕관
function empty_lecture_next_2() {
  try {
    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isClassTime = currentHour > 9 || (currentHour === 9 && currentMinute >= 30) && (currentHour < 23 || (currentHour === 23 && currentMinute <= 30));
    let response;

    if (today === 6 || today === 0) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗오늘은 주말입니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else if (!isClassTime) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗수업시간이 아닙니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else {
      const empty = findAvailableClassroomsNext(lectureList);

      const buildingCode = '2';
      const floors = {
        '1': [], '2': [], '3': [], '4': [], '5': [],
        '6': [], '7': [], '8': [], '9': [], '0': [],
      };

      empty.forEach(classroom => {
        const currentBuildingCode = classroom.charAt(0);
        const floorName = getCurrentFloor(classroom);

        if (currentBuildingCode === buildingCode) {
          if (!floors[floorName]) {
            floors[floorName] = [];
          }

          floors[floorName].push(classroom);
        }
      });

      const sortedFloors = sortFloors(floors);

      response = createBuildingResponseNext_2('선덕관', buildingCode, sortedFloors, false);
    }
    return response;
  } catch (error) {
    console.log(error)
    response = {
      "fulfillmentText": "예기치 않은 응답입니다.",
      "type": "chips",
      "options": [
        {
          "event": {
            "languageCode": "string",
            "parameters": {},
            "name": "main"
          },
          "text": "홈으로"
        }
      ]
    }
    return response;
  }
};


//다음 교시 빈 강의실 - 충효관
function empty_lecture_next_3() {
  try {
    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isClassTime = currentHour > 9 || (currentHour === 9 && currentMinute >= 30) && (currentHour < 23 || (currentHour === 23 && currentMinute <= 30));
    let response;

    if (today === 6 || today === 0) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗오늘은 주말입니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else if (!isClassTime) {
      response = {
        "fulfillment_messages": [{
          "payload": {
            "richContent": [
              [
                {
                  "type": "description",
                  "title": "❗수업시간이 아닙니다.❗",
                  "text": "해당 기능이 제공되지않습니다.",
                },
                {
                  "type": "chips",
                  "options": [
                    {
                      "event": {
                        "languageCode": "string",
                        "parameters": {},
                        "name": "main"
                      },
                      "text": "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      }
    } else {
      const empty = findAvailableClassroomsNext(lectureList);

      const buildingCode = '3';
      const floors = {
        '1': [], '2': [], '3': [], '4': [], '5': [],
        '6': [], '7': [], '8': [], '9': [], '0': [],
      };

      empty.forEach(classroom => {
        const currentBuildingCode = classroom.charAt(0);
        const floorName = getCurrentFloor(classroom);

        if (currentBuildingCode === buildingCode) {
          if (!floors[floorName]) {
            floors[floorName] = [];
          }

          floors[floorName].push(classroom);
        }
      });

      const sortedFloors = sortFloors(floors);

      response = createBuildingResponseNext_3('충효관', buildingCode, sortedFloors, false);
    }
    return response;
  } catch (error) {
    console.log(error)
    response = {
      "fulfillmentText": "예기치 않은 응답입니다.",
      "type": "chips",
      "options": [
        {
          "event": {
            "languageCode": "string",
            "parameters": {},
            "name": "main"
          },
          "text": "홈으로"
        }
      ]
    }
    return response;
  }
};


//강의 찾기

function findSimilarLectures(userInput, lectureInfo) {
  if (!userInput) {
    return lectureInfo;
  }
  return lectureInfo.filter(lecture => lecture.과목명.includes(userInput));
}


function lecture_info_find(params, outputContexts, session) {
  try {
    let userInput;
    let response = {};

    if (params && params.lecture_name && params.lecture_name.length > 0) {
      userInput = params.lecture_name[0];
    } else {
      response = {
        fulfillmentText: "검색할 강의명을 입력해주세요. (\"?\" 입력 시 취소)",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "강의명을 입력해주세요:"
                  }
                ]
              ]
            }
          }
        ]
      };
      return response;
    }

    const similarLectures = findSimilarLectures(userInput, lectureInfo);

    if (similarLectures && similarLectures.length > 0) {
      response = {
        outputContexts: [
          {
            name: `${session}/contexts/lecture_info_context`,
            lifespanCount: 5,
            parameters: {
              similarLectures: similarLectures,
              userInput: userInput
            }
          }
        ],
        fulfillmentMessages: [{
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: `📖번호 확인 후 번호 입력 클릭📖\n\n번호 - 과목 - 교수 - 분반 순\n\n${similarLectures.map((lecture, index) => `${index + 1}. ${lecture.과목명} ${lecture.교수명} ${lecture.분반}`).join('\n')}\n`,
                },
                {
                  type: "button",
                  icon: {
                    type: "chevron_right",
                    color: "#FF9800"
                  },
                  text: "번호 입력",
                  event: {
                    name: "lecture_info_select",
                    languageCode: "ko",
                    parameters: {}
                  }
                },
                {
                  type: "button",
                  icon: {
                    type: "chevron_right",
                    color: "#FF9800"
                  },
                  text: "다시 입력",
                  event: {
                    name: "lecture_info_find",
                    languageCode: "ko",
                    parameters: {}
                  }
                }
              ]
            ]
          }
        }]
      };
    } else {
      response = {
        fulfillmentMessages: [{
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗일치하거나 유사한 강의가 없습니다.❗",
                },
                {
                  type: "chips",
                  options: [
                    {
                      event: {
                        name: "lecture_info_find",
                        parameters: {},
                        languageCode: "ko"
                      },
                      text: "다시 입력"
                    }
                  ]
                }
              ]
            ]
          }
        }]
      };
    }
    return response;
  } catch (error) {
    console.log(error);
    const response = {
      fulfillmentText: "예기치 않은 응답입니다.",
      fulfillmentMessages: [{
        payload: {
          richContent: [
            [
              {
                type: "description",
                title: "❗예기치 않은 응답입니다.❗",
              },
              {
                type: "chips",
                options: [
                  {
                    event: {
                      name: "main",
                      parameters: {},
                      languageCode: "ko"
                    },
                    text: "홈으로"
                  }
                ]
              }
            ]
          ]
        }
      }]
    };
    return response;
  }
}




function lecture_info_select(params, outputContexts, session) {
  try {
    const lecture_no = Array.isArray(params.lecture_no) ? parseInt(params.lecture_no[0], 10) : parseInt(params.lecture_no, 10);
    let similarLectures = [];
    let userInput = null;

    // outputContexts에서 similarLectures와 userInput을 가져오기
    for (let context of outputContexts) {
      if (context.name.endsWith("/contexts/lecture_info_context")) {
        similarLectures = context.parameters.similarLectures;
        userInput = context.parameters.userInput;
        break;
      }
    }

    if (!similarLectures || !userInput) {
      return {
        fulfillmentText: "이전 단계를 먼저 진행해주세요.",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "이전 단계를 먼저 진행해주세요."
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    if (isNaN(lecture_no) || lecture_no < 1 || lecture_no > similarLectures.length) {
      return {
        fulfillmentText: "번호를 입력해주세요.",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "번호를 입력해주세요:"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    const selectedLecture = similarLectures[lecture_no - 1];
    const selectedLectureInfo = lectureInfo.find(lecture =>
      lecture.과목명 === selectedLecture.과목명 &&
      lecture.교수명 === selectedLecture.교수명 &&
      lecture.분반 === selectedLecture.분반
    );

    const selectedLectureInfo2 = lectureList.find(lecture =>
      lecture.과목명 === selectedLecture.과목명 &&
      lecture.분반 === selectedLecture.분반
    );

    if (!selectedLectureInfo) {
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗강의 정보를 찾을 수 없습니다.❗"
                  },
                  {
                    event: {
                      name: "lecture_info_find",
                      parameters: {},
                      languageCode: "ko"
                    },
                    text: "다시 입력"
                  }
                ]
              ]
            }
          }
        ]
      };
    } else {
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "list",
                    title: "📖선택한 강의정보📖",
                    subtitle: `강의명: ${selectedLectureInfo.과목명}\n교수명: ${selectedLectureInfo.교수명}\n분반: ${selectedLectureInfo.분반}`
                  },
                  {
                    type: "accordion",
                    title: "강좌 기본정보",
                    text: selectedLectureInfo.강좌기본정보 || `과목코드: ${selectedLectureInfo2.과목코드}\n <br> 과목명: ${selectedLectureInfo2.과목명}\n <br>시간표: ${selectedLectureInfo2.시간표}\n <br>강의실: ${selectedLectureInfo2.강의실}\n <br> 교수명: ${selectedLectureInfo.교수명}\n <br> 핸드폰: ${selectedLectureInfo.핸드폰}\n <br> 이메일: ${selectedLectureInfo.이메일}\n <br>  분반: ${selectedLectureInfo.분반}\n <br> 성적평가구분: ${selectedLectureInfo.성적평가구분}\n <br>  과정구분: ${selectedLectureInfo.과정구분}\n <br> 이수구분: ${selectedLectureInfo.이수구분}\n <br> 개설학과: ${selectedLectureInfo.개설학과}\n <br> 개설학년: ${selectedLectureInfo.개설학년}\n <br> 교재 및 참고 문헌: ${selectedLectureInfo['교재 및 참고 문헌']}`
                  },
                  {
                    type: "accordion",
                    title: "교과 개요",
                    text: selectedLectureInfo.교과개요 || `교과목개요▼\n <br><br> ${selectedLectureInfo.교과목개요}\n\n <br><br> 교과목표▼\n  <br><br> ${selectedLectureInfo.교과목표}`
                  },
                  {
                    type: "accordion",
                    title: "평가 항목 및 방법",
                    text: selectedLectureInfo.평가항목및방법 || `출석▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].출석.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].출석.평가방법_및_주요내용}\n\n <br><br> 중간▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].중간.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].중간.평가방법_및_주요내용}\n\n<br><br>기말▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].기말.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].기말.평가방법_및_주요내용}\n\n<br><br>과제▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].과제.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].과제.평가방법_및_주요내용}\n\n<br><br>기타▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].기타.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].기타.평가방법_및_주요내용}\n\n<br><br>과제개요▼\n <br>과제주제: ${selectedLectureInfo['평가항목 및 방법'].과제개요.과제주제}\n <br>분량 : ${selectedLectureInfo['평가항목 및 방법'].과제개요.분량}\n <br>제출일자: ${selectedLectureInfo['평가항목 및 방법'].과제개요.제출일자}`
                  },
                  {
                    type: "button",
                    icon: {
                      type: "calendar_month",
                      color: "#FF9800"
                    },
                    text: "시간표에 저장",
                    event: {
                      name: "lecture_schedule_save",
                      parameters: {
                        save: {
                          type: "lecture",
                          userInput: userInput,
                          lecture_no: lecture_no,
                          lectures: selectedLectureInfo.과목명,
                          professor: selectedLectureInfo.교수명,
                          classes: selectedLectureInfo.분반
                        }
                      },
                      languageCode: "ko"
                    }
                  },
                  {
                    type: "chips",
                    options: [
                      {
                        event: {
                          name: "main",
                          parameters: {},
                          languageCode: "ko"
                        },
                        text: "홈으로"
                      }
                    ]
                  }
                ]
              ]
            }
          }
        ]
      };
    }
  } catch (error) {
    console.log(error);
    return {
      fulfillmentText: "예기치 않은 응답입니다.",
      fulfillmentMessages: [{
        payload: {
          richContent: [
            [
              {
                type: "description",
                title: "❗예기치 않은 응답입니다.❗"
              },
              {
                type: "chips",
                options: [
                  {
                    event: {
                      name: "main",
                      parameters: {},
                      languageCode: "ko"
                    },
                    text: "홈으로"
                  }
                ]
              }
            ]
          ]
        }
      }]
    };
    return response;
  }
}




//교수 정보 검색
function lecture_professor_find(params, outputContexts, session) {
  try {
    const extra = params.clientExtra;
    let userInput;
    let response = {};

    if (extra && extra.type === "back_select") {
      userInput = extra.userInput;
    } else {
      userInput = Array.isArray(params.professor_name) ? params.professor_name[0] : params.professor_name;
    }

    // Ensure userInput is a string
    if (!userInput || typeof userInput !== 'string') {
      return {
        fulfillmentText: "교수 이름을 입력해주세요.",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "교수 이름을 입력해주세요:"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    const similarProfessors = findSimilarProfessors(userInput, lectureList);

    if (similarProfessors && similarProfessors.length > 0) {
      response = {
        outputContexts: [
          {
            name: `${session}/contexts/lecture_professor_context`,
            lifespanCount: 5,
            parameters: {
              similarProfessors: similarProfessors,
              userInput: userInput
            }
          }
        ],
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: `📖번호 확인 후 번호 입력 클릭📖\n\n번호 - 교수 - 소속 순\n\n${similarProfessors.map((lecture, index) => `${index + 1}. ${lecture.교수명} ${lecture.소속}`).join('\n')}\n`
                  },
                  {
                    type: "button",
                    icon: {
                      type: "chevron_right",
                      color: "#FF9800"
                    },
                    text: "번호 입력",
                    event: {
                      name: "lecture_professor_select",
                      languageCode: "ko",
                      parameters: {}
                    }
                  },
                  {
                    type: "button",
                    icon: {
                      type: "chevron_right",
                      color: "#FF9800"
                    },
                    text: "다시 입력",
                    event: {
                      name: "lecture_professor_find",
                      languageCode: "ko",
                      parameters: {}
                    }
                  }
                ]
              ]
            }
          }
        ]
      };
    } else {
      response = {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗일치하거나 유사한 교수가 없습니다.❗"
                  },
                  {
                    type: "button",
                    icon: {
                      type: "chevron_right",
                      color: "#FF9800"
                    },
                    text: "다시 입력",
                    event: {
                      name: "lecture_professor_find",
                      languageCode: "ko",
                      parameters: {}
                    }
                  }
                ]
              ]
            }
          }
        ]
      };
    }
    return response;
  } catch (error) {
    console.log(error);
    return {
      fulfillmentText: "예기치 않은 응답입니다.",
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗예기치 않은 응답입니다.❗"
                },
                {
                  type: "chips",
                  options: [
                    {
                      event: {
                        name: "main",
                        parameters: {},
                        languageCode: "ko"
                      },
                      text: "홈으로"
                    }
                  ]
                }
              ]
            ]
          }

        }]
    };
  }
}





//교수
function lecture_professor_select(params, outputContexts, session) {
  try {
    const professor_no = Array.isArray(params.professor_no) ? parseInt(params.professor_no[0], 10) : parseInt(params.professor_no, 10);
    let similarProfessors = [];
    let userInput = null;

    for (let context of outputContexts) {
      if (context.name.endsWith("/contexts/lecture_professor_context")) {
        similarProfessors = context.parameters.similarProfessors;
        userInput = context.parameters.userInput;
        break;
      }
    }

    if (!similarProfessors || !userInput) {
      return {
        fulfillmentText: "이전 단계를 먼저 진행해주세요.",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "이전 단계를 먼저 진행해주세요."
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    if (isNaN(professor_no) || professor_no < 1 || professor_no > similarProfessors.length) {
      return {
        fulfillmentText: "번호를 입력해주세요.",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "번호를 입력해주세요:"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    const selectedProfessors = similarProfessors[professor_no - 1];

    const selectedProfessorInfo = lectureInfo.find(lecture =>
      lecture.교수명 === selectedProfessors.교수명
    );
    const selectedProfessorInfo2 = lectureList.find(lecture =>
      lecture.교수명 === selectedProfessors.교수명
    );

    if (!selectedProfessorInfo) {
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗교수 정보를 찾을 수 없습니다.❗"
                  },
                  {
                    event: {
                      name: "lecture_professor_find",
                      parameters: {},
                      languageCode: "ko"
                    },
                    text: "다시 입력"
                  }
                ]
              ]
            }
          }
        ]
      };
    } else {
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "list",
                    title: "📖선택한 교수정보📖",
                    subtitle: `교수명: ${selectedProfessorInfo.교수명}\n소속: ${selectedProfessorInfo2.소속}\n핸드폰: ${selectedProfessorInfo.핸드폰}\n이메일: ${selectedProfessorInfo.이메일}`
                  },
                  {
                    type: "button",
                    icon: {
                      type: "chevron_right",
                      color: "#FF9800"
                    },
                    text: "개설강좌 리스트",
                    event: {
                      name: "lecture_professor_info_find",
                      languageCode: "ko",
                      parameters: { professor_name: selectedProfessorInfo.교수명 }
                    }
                  }
                ]
              ]
            }
          }
        ]
      };
    }
  } catch (error) {
    console.log(error);
    return {
      fulfillmentText: "예기치 않은 응답입니다.",
      fulfillmentMessages: [{
        payload: {
          richContent: [
            [
              {
                type: "description",
                title: "❗예기치 않은 응답입니다.❗"
              },
              {
                type: "chips",
                options: [
                  {
                    event: {
                      name: "main",
                      parameters: {},
                      languageCode: "ko"
                    },
                    text: "홈으로"
                  }
                ]
              }
            ]
          ]
        }
      }]
    };
  }
}



function lecture_professor_info_find(params, outputContexts, session) {
  try {
    let userInput = "";
    let professor_name = Array.isArray(params.professor_name) ? params.professor_name[0] : params.professor_name;
    let response = {};

    // outputContexts에서 userInput 추출
    for (let context of outputContexts) {
      if (context.name.endsWith("/contexts/lecture_professor_context")) {
        userInput = context.parameters.userInput || "";
        break;
      }
    }

    // userInput이 문자열인지 확인
    if (typeof userInput !== 'string') {
      userInput = String(userInput);
    }

    // 필수 파라미터가 존재하는지 확인
    if (!professor_name) {
      return {
        fulfillmentText: "교수 이름을 입력해주세요.",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "교수 이름을 입력해주세요:"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    const similarLectures = findSimilarProfessorsNofilter(professor_name, lectureInfo);

    if (similarLectures && similarLectures.length > 0) {
      response = {
        outputContexts: [
          {
            name: `${session}/contexts/lecture_professor_info_context`,
            lifespanCount: 5,
            parameters: {
              similarLectures: similarLectures,
              userInput: userInput,
              professor_name: professor_name
            }
          }
        ],
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: `📖번호 확인 후 번호 입력 클릭📖\n\n번호 - 과목 - 교수 - 분반 순\n\n${similarLectures.map((lecture, index) => `${index + 1}. ${lecture.과목명} ${lecture.교수명} ${lecture.분반}`).join('\n')}\n`
                  },
                  {
                    type: "button",
                    icon: {
                      type: "chevron_right",
                      color: "#FF9800"
                    },
                    text: "번호 입력",
                    event: {
                      name: "lecture_professor_info_select",
                      languageCode: "ko",
                      parameters: {}
                    }
                  }
                ]
              ]
            }
          }
        ]
      };
    } else {
      response = {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗개설된 강의가 없습니다.❗"
                  },
                  {
                    type: "chips",
                    options: [
                      {
                        event: {
                          name: "lecture_professor_info_find",
                          parameters: {
                            type: 'back_info_find',
                            userInput: userInput,
                            professor_name: professor_name
                          },
                          languageCode: "ko"
                        },
                        text: "뒤로가기"
                      }
                    ]
                  }
                ]
              ]
            }
          }
        ]
      };
    }
    return response;
  } catch (error) {
    console.log(error);
    return {
      fulfillmentText: "예기치 않은 응답입니다.",
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗예기치 않은 응답입니다.❗"
                },
                {
                  type: "chips",
                  options: [
                    {
                      event: {
                        name: "main",
                        parameters: {},
                        languageCode: "ko"
                      },
                      text: "홈으로"
                    }
                  ]
                }
              ]
            ]
          }

        }]
    };
  }
}





function lecture_professor_info_select(params, outputContexts, session) {
  try {
    const professor_no = Array.isArray(params.professor_no) ? parseInt(params.professor_no[0], 10) : parseInt(params.professor_no, 10);
    let similarLectures = [];
    let userInput = "";
    let professor_name = "";

    // outputContexts에서 필요한 정보 추출
    for (let context of outputContexts) {
      if (context.name.endsWith("/contexts/lecture_professor_info_context")) {
        similarLectures = context.parameters.similarLectures;
        userInput = context.parameters.userInput || "";
        professor_name = context.parameters.professor_name || "";
        break;
      }
    }

    // userInput이 문자열인지 확인
    if (typeof userInput !== 'string') {
      userInput = String(userInput);
    }

    if (!similarLectures || !userInput || !professor_name) {
      return {
        fulfillmentText: "이전 단계를 먼저 진행해주세요.",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "이전 단계를 먼저 진행해주세요."
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    if (isNaN(professor_no) || professor_no < 1 || professor_no > similarLectures.length) {
      return {
        fulfillmentText: "번호를 입력해주세요.",
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "번호를 입력해주세요:"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    const selectedLecture = similarLectures[professor_no - 1];
    const selectedLectureInfo = lectureInfo.find(lecture =>
      lecture.과목명 === selectedLecture.과목명 &&
      lecture.교수명 === selectedLecture.교수명 &&
      lecture.분반 === selectedLecture.분반
    );

    const selectedLectureInfo2 = lectureList.find(lecture =>
      lecture.과목명 === selectedLecture.과목명 &&
      lecture.분반 === selectedLecture.분반
    );

    if (!selectedLectureInfo) {
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗강의 정보를 찾을 수 없습니다.❗"
                  },
                  {
                    event: {
                      name: "lecture_professor_info_find",
                      parameters: {},
                      languageCode: "ko"
                    },
                    text: "다시 입력"
                  }
                ]
              ]
            }
          }
        ]
      };
    } else {
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "list",
                    title: "📖선택한 강의정보📖",
                    subtitle: `강의명: ${selectedLectureInfo.과목명}\n교수명: ${selectedLectureInfo.교수명}\n분반: ${selectedLectureInfo.분반}`
                  },
                  {
                    type: "accordion",
                    title: "강좌 기본정보",
                    text: selectedLectureInfo.강좌기본정보 || `과목코드: ${selectedLectureInfo2.과목코드}\n <br> 과목명: ${selectedLectureInfo2.과목명}\n <br>시간표: ${selectedLectureInfo2.시간표}\n <br>강의실: ${selectedLectureInfo2.강의실}\n <br> 교수명: ${selectedLectureInfo.교수명}\n <br> 핸드폰: ${selectedLectureInfo.핸드폰}\n <br> 이메일: ${selectedLectureInfo.이메일}\n <br>  분반: ${selectedLectureInfo.분반}\n <br> 성적평가구분: ${selectedLectureInfo.성적평가구분}\n <br>  과정구분: ${selectedLectureInfo.과정구분}\n <br> 이수구분: ${selectedLectureInfo.이수구분}\n <br> 개설학과: ${selectedLectureInfo.개설학과}\n <br> 개설학년: ${selectedLectureInfo.개설학년}\n <br> 교재 및 참고 문헌: ${selectedLectureInfo['교재 및 참고 문헌']}`
                  },
                  {
                    type: "accordion",
                    title: "교과 개요",
                    text: selectedLectureInfo.교과개요 || `교과목개요▼\n <br><br> ${selectedLectureInfo.교과목개요}\n\n <br><br> 교과목표▼\n <br><br> ${selectedLectureInfo.교과목표}`
                  },
                  {
                    type: "accordion",
                    title: "평가 항목 및 방법",
                    text: selectedLectureInfo.평가항목및방법 || `출석▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].출석.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].출석.평가방법_및_주요내용}\n\n <br><br> 중간▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].중간.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].중간.평가방법_및_주요내용}\n\n<br><br>기말▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].기말.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].기말.평가방법_및_주요내용}\n\n<br><br>과제▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].과제.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].과제.평가방법_및_주요내용}\n\n<br><br>기타▼\n <br>반영비율: ${selectedLectureInfo['평가항목 및 방법'].기타.반영비율}\n <br>평가방법 및 주요내용: ${selectedLectureInfo['평가항목 및 방법'].기타.평가방법_및_주요내용}\n\n<br><br>과제개요▼\n <br>과제주제: ${selectedLectureInfo['평가항목 및 방법'].과제개요.과제주제}\n <br>분량 : ${selectedLectureInfo['평가항목 및 방법'].과제개요.분량}\n <br>제출일자: ${selectedLectureInfo['평가항목 및 방법'].과제개요.제출일자}`
                  },
                  {
                    type: "button",
                    icon: {
                      type: "calendar_month",
                      color: "#FF9800"
                    },
                    text: "시간표에 저장",
                    event: {
                      name: "lecture_schedule_save",
                      parameters: {
                        save: {
                          type: "professor",
                          userInput: userInput,
                          professor_no: professor_no,
                          lectures: selectedLectureInfo.과목명,
                          professor: selectedLectureInfo.교수명,
                          classes: selectedLectureInfo.분반
                        }
                      },
                      languageCode: "ko"
                    }
                  },
                  {
                    type: "chips",
                    options: [
                      {
                        event: {
                          name: "main",
                          parameters: {},
                          languageCode: "ko"
                        },
                        text: "홈으로"
                      }
                    ]
                  }
                ]
              ]
            }
          }
        ]
      };
    }
  } catch (error) {
    console.log(error);
    return {
      fulfillmentText: "예기치 않은 응답입니다.",
      fulfillmentMessages: [{
        payload: {
          richContent: [
            [
              {
                type: "description",
                title: "❗예기치 않은 응답입니다.❗"
              },
              {
                type: "chips",
                options: [
                  {
                    event: {
                      name: "main",
                      parameters: {},
                      languageCode: "ko"
                    },
                    text: "홈으로"
                  }
                ]
              }
            ]
          ]
        }
      }]
    };
  }
}







//강의 저장 

async function lecture_schedule_save(params, outputContexts, session) {
  let extra = {};
  let similarLectures = [];
  let userInput = "";

  // outputContexts가 정의되지 않은 경우 빈 배열로 초기화
  if (!outputContexts) {
    outputContexts = [];
  }

  for (let context of outputContexts) {
    if (context.name.endsWith('/contexts/lecture_info_context') || context.name.endsWith('/contexts/lecture_professor_info_context')) {
      extra = context.parameters;
      similarLectures = context.parameters.similarLectures;
      userInput = context.parameters.userInput;
      break;
    }
  }

  if (!similarLectures || !similarLectures.length) {
    return Promise.resolve({
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗강의 정보를 찾을 수 없습니다.❗"
                }
              ]
            ]
          }
        }
      ]
    });
  }

  const userId = session.split('/').pop();
  const type = extra.type || "";
  const lecture_no = extra.lecture_no ? parseInt(extra.lecture_no[0], 10) : null;
  const professor_no = extra.professor_no ? parseInt(extra.professor_no[0], 10) : null;
  const professor_no2 = extra.professor_no2;
  const professor_name = extra.professor_name;

  let selectedLectureIndex;
  if (lecture_no) {
    selectedLectureIndex = lecture_no - 1;
  } else if (professor_no) {
    selectedLectureIndex = professor_no - 1;
  } else {
    return Promise.resolve({
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗유효하지 않은 강의 또는 교수 번호입니다.❗"
                }
              ]
            ]
          }
        }
      ]
    });
  }

  if (selectedLectureIndex < 0 || selectedLectureIndex >= similarLectures.length) {
    return Promise.resolve({
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗유효하지 않은 강의 또는 교수 번호입니다.❗"
                }
              ]
            ]
          }
        }
      ]
    });
  }

  const lectureData = similarLectures[selectedLectureIndex];
  const lectures = lectureData.과목명;
  const professor = lectureData.교수명;
  const classes = lectureData.분반;

  const selectedLectureInfo = lectureList.find(lecture =>
    lecture.과목명 === lectures &&
    lecture.분반 === classes
  );

  if (!selectedLectureInfo) {
    return Promise.resolve({
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗강의 정보를 찾을 수 없습니다.❗"
                }
              ]
            ]
          }
        }
      ]
    });
  }

  const time = selectedLectureInfo.시간표;
  const place = selectedLectureInfo.강의실;
  const lecture_type = selectedLectureInfo.과목구분;
  let response;
  let extraSet;
  let eventName;

  if (type === "lecture") {
    eventName = "lecture_info_select2";
    extraSet = {
      'type': 'back_search',
      'userInput': userInput,
      'lecture_no': lecture_no
    };
  } else {
    eventName = "lecture_professor_info_select2";
    extraSet = {
      'type': 'back_search',
      'userInput': userInput,
      'professor_no': professor_no,
      'professor_no2': professor_no2,
      'professor_name': professor_name
    };
  }

  if (lecture_type === "사이버강의") {
    return Promise.resolve({
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗사이버 강의는 시간표에 저장되지 않습니다.❗"
                },
                {
                  type: "chips",
                  options: [
                    {
                      event: {
                        name: "main",
                        parameters: {},
                        languageCode: "ko"
                      },
                      text: "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }
      ]
    });
  } else if (time.includes('토') || time.includes('일')) {
    return Promise.resolve({
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: "❗수업시간이 주말인 강의는 시간표에 저장되지 않습니다.❗"
                },
                {
                  type: "chips",
                  options: [
                    {
                      event: {
                        name: "main",
                        parameters: {},
                        languageCode: "ko"
                      },
                      text: "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }
      ]
    });
  } else {
    return findUserRow(userId, auth_global, SPREADSHEET_ID)
      .then(userRow => {
        if (!userRow) {
          return addUserRow(userId, auth_global, SPREADSHEET_ID);
        }
        return userRow;
      })
      .then(userRow => {
        const timeIndices = getTimeIndex(time);
        const timeIndex = getColumnIndex(timeIndices);
        const rowData = [lectures + '\n' + classes + '\n' + professor + '\n' + place];

        const columnReadPromises = timeIndex.map(index => readFromGoogleSheets(auth_global, SPREADSHEET_ID, `시간표!${index.toString()}${userRow}`));
        return Promise.all(columnReadPromises)
          .then(columnDataArray => {
            let overlappingColumnsData = columnDataArray
              .filter(columnData => columnData && columnData.length > 0)
              .map((columnData, index) => {
                return readFromGoogleSheets(auth_global, SPREADSHEET_ID, `시간표!${timeIndex[index].toString()}1`)
                  .then(columnHeader => ({ index: columnHeader, data: columnData }));
              });
            return Promise.all(overlappingColumnsData);
          })
          .then(overlappingColumnsData => {
            if (overlappingColumnsData.length > 0) {
              let text = "❗수업시간이 겹치는 강의가 있습니다.❗\n\n";
              overlappingColumnsData.forEach(overlappingColumn => {
                const { index, data } = overlappingColumn;
                const combine = data[0][0].replace(/\n/g, ' ');
                text += `${combine} - ${index}\n`;
              });

              response = {
                fulfillmentMessages: [
                  {
                    payload: {
                      richContent: [
                        [
                          {
                            type: "description",
                            title: text
                          },
                          {
                            type: "chips",
                            options: [
                              {
                                event: {
                                  name: "main",
                                  parameters: {},
                                  languageCode: "ko"
                                },
                                text: "홈으로"
                              }
                            ]
                          }
                        ]
                      ]
                    }
                  }
                ]
              };
              return response;
            } else {
              const ranges = timeIndex.map(index => `시간표!${index.toString()}${userRow}`);
              const rowDataArray = Array(timeIndex.length).fill(rowData);
              return batchWriteToGoogleSheets(auth_global, SPREADSHEET_ID, ranges, rowDataArray)
                .then(() => {
                  response = {
                    fulfillmentMessages: [
                      {
                        payload: {
                          richContent: [
                            [
                              {
                                type: "description",
                                title: `⭕해당 강의를 시간표에 저장했습니다.⭕`
                              },
                              {
                                type: "chips",
                                options: [
                                  {
                                    event: {
                                      name: "main",
                                      parameters: {},
                                      languageCode: "ko"
                                    },
                                    text: "홈으로"
                                  }
                                ]
                              }
                            ]
                          ]
                        }
                      }
                    ]
                  };
                  return response;
                });
            }
          });
      })
      .catch(error => {
        console.log(error);
        return {
          fulfillmentMessages: [
            {
              payload: {
                richContent: [
                  [
                    {
                      type: "description",
                      title: "예기치 않은 응답입니다."
                    }
                  ]
                ]
              }
            }
          ]
        };
      });
  }
}






async function lecture_schedule_edit(params, outputContexts, session) {
  const userId = session.split('/').pop();
  let response;



  try {
    const userRow = await findUserRow(userId, auth_global, SPREADSHEET_ID);


    if (userRow) {
      const rowData = await readFromGoogleSheets(auth_global, SPREADSHEET_ID, `시간표!B${userRow}:BS${userRow}`);


      if (rowData && rowData.length > 0) {
        const uniqueRowData = removeDuplicatesAndEmpty(rowData[0]);
        const separatedData = uniqueRowData.map(row => row.split("\n"));
        const lectures = separatedData.map(data => data[0].replace(/\s+/g, '').toUpperCase());
        const classes = separatedData.map(data => data[1]);
        const professors = separatedData.map(data => data[2].replace(/\s+/g, '').toUpperCase());
        const places = separatedData.map(data => data[3]);
        const selectedLectureInfo = [];

        for (let i = 0; i < lectures.length; i++) {
          const lectureName = lectures[i];
          const classNumber = classes[i];
          const professorName = professors[i];
          const place = places[i];
          const lecture = lectureList.find(lecture =>
            lecture.과목명.toUpperCase() === lectureName &&
            lecture.분반 === classNumber &&
            lecture.교수명.toUpperCase() === professorName
          );
          if (lecture) {
            selectedLectureInfo.push(lecture);
          }
        }

        const lectureListText = selectedLectureInfo.map((info, index) => `${index + 1}. ${info.과목명} ${info.분반} ${info.교수명} ${info.강의실}`).join("\n");

        response = {
          outputContexts: [
            {
              name: `${session}/contexts/lecture_schedule_delete`,
              lifespanCount: 5,
              parameters: {
                selectedLectureInfo: selectedLectureInfo // 여기에 selectedLectureInfo를 추가합니다.
              }
            }
          ],
          fulfillmentMessages: [
            {
              payload: {
                richContent: [
                  [
                    {
                      type: "description",
                      title: `현재 시간표:\n\n${lectureListText}`
                    },
                    {
                      type: "button",
                      icon: {
                        type: "edit",
                        color: "#FF9800"
                      },
                      text: "시간표 수정",
                      event: {
                        name: "lecture_schedule_delete",
                        languageCode: "ko",
                        parameters: { selectedLectureInfo: selectedLectureInfo }
                      }
                    }
                  ]
                ]
              }
            }
          ]
        };

        return response;
      } else {
        response = {
          fulfillmentText: "시간표를 찾을 수 없습니다."
        };
        return response;
      }
    } else {
      response = {
        fulfillmentText: "사용자를 찾을 수 없습니다."
      };
      return response;
    }
  } catch (error) {
    console.log(error);
    response = {
      fulfillmentText: "예기치 않은 오류가 발생했습니다."
    };
    return response;
  }
}



async function lecture_schedule_delete(params, outputContexts, session) {
  try {

    // userId 추출
    const userId = session.split('/').pop();

    // userRow 찾기
    const userRow = await findUserRow(userId, auth_global, SPREADSHEET_ID);
    if (!userRow) {
      console.log('사용자 정보를 찾을 수 없습니다.');
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗사용자 정보를 찾을 수 없습니다.❗"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    // schedule_no를 배열에서 추출
    let schedule_no = params.schedule_no && params.schedule_no[0];
    schedule_no = parseInt(schedule_no, 10);

    // 유효성 검사
    if (isNaN(schedule_no) || schedule_no <= 0) {
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗삭제할 강의의 번호를 입력해주세요.❗"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    // `lecture_schedule_delete` 컨텍스트를 찾습니다.
    const lectureScheduleContext = outputContexts.find(context => context.name.includes('lecture_schedule_delete'));
    if (!lectureScheduleContext || !lectureScheduleContext.parameters.selectedLectureInfo) {
      console.error('selectedLectureInfo가 없습니다.');
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗강의 정보를 찾을 수 없습니다.❗"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    const selectedLectureInfo = lectureScheduleContext.parameters.selectedLectureInfo;

    if (!selectedLectureInfo || selectedLectureInfo.length < schedule_no) {
      console.log('schedule_no가 없거나 잘못된 값입니다.');
      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "description",
                    title: "❗삭제할 강의의 번호를 입력해주세요.❗"
                  }
                ]
              ]
            }
          }
        ]
      };
    }

    let selectedLectureInfos = selectedLectureInfo[schedule_no - 1];
    let combine = `${selectedLectureInfos.과목명}\n${selectedLectureInfos.분반}\n${selectedLectureInfos.교수명}\n${selectedLectureInfos.강의실}`;
    let combine2 = `${selectedLectureInfos.과목명} ${selectedLectureInfos.분반} ${selectedLectureInfos.교수명} ${selectedLectureInfos.강의실}`;
    let response;

    await deleteToGoogleSheets(auth_global, SPREADSHEET_ID, `시간표!B${userRow}:BS${userRow}`, combine);

    response = {
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: `❌해당 강의를 삭제했습니다.❌\n\n${combine2}`
                },
                {
                  type: "chips",
                  options: [
                    {
                      event: {
                        name: "main",
                        parameters: {},
                        languageCode: "ko"
                      },
                      text: "홈으로"
                    }
                  ]
                }
              ]
            ]
          }
        }]
    };

    return response;
  } catch (error) {
    console.log(error);
    return {
      fulfillmentMessages: [
        {
          payload: {
            richContent: [
              [
                {
                  type: "description",
                  title: `예기치 않은 응답입니다.`
                }
              ]
            ]
          }
        }]
    };
  }
}


app.get('/schedule_load', async (req, res) => {
  try {
    const scheduleData = await getScheduleData(auth_global, SPREADSHEET_ID);
    res.json({ scheduleData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




async function lecture_schedule_print(session) {
  try {
    const userId = session.split('/').pop();
    if (!userId) {
      throw new Error('세션에서 사용자 ID를 가져올 수 없습니다.');
    }

    const url = `http://35.216.59.180:8080/schedule.html?userId=${userId}`;
    console.log(`생성된 URL: ${url}`);

    let userRow = await findUserRow(userId, auth_global, SPREADSHEET_ID);

    let response;

    if (userRow) {
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR'
      });
      page.setViewport({ width: 1080, height: 800 });
      page.setDefaultNavigationTimeout(0);
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.evaluate(() => {
        document.body.style.fontFamily = 'Nanum Gothic, sans-serif';
      });

      const imageBuffer = await page.screenshot({ fullPage: true });
      const imageName = `${userId}_schedule_image.png`;
      const imageFullPath = path.join(imagePath, imageName);

      // 기존 이미지를 삭제
      if (fs.existsSync(imageFullPath)) {
        fs.unlinkSync(imageFullPath);
        console.log(`기존 이미지 삭제: ${imageFullPath}`);
      }

      console.log(`이미지 저장 경로: ${imageFullPath}`);
      fs.writeFileSync(imageFullPath, imageBuffer);
      await browser.close();

      // 맞춤 도메인 사용하여 이미지 URL 생성 및 타임스탬프 추가
      const timestamp = new Date().getTime();
      const imageUrl = `https://bori.ngrok.dev/images/${imageName}?t=${timestamp}`;
      console.log(`생성된 이미지 URL: ${imageUrl}`);

      response = {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    type: "image",
                    rawUrl: imageUrl,
                    accessibilityText: "시간표 이미지"
                  },
                  {
                    type: "chips",
                    options: [
                      {
                        text: "홈으로",
                        event: {
                          name: "main",
                          parameters: {},
                          languageCode: "ko"
                        }
                      }
                    ]
                  }
                ]
              ]
            }
          }
        ]
      };
    } else {
      console.log(`사용자 ${userId}의 시간표가 없습니다.`);
      response = {
        fulfillmentMessages: [
          {
            text: {
              text: [`❗시간표에 저장된 강의가 없습니다.❗`]
            }
          }
        ]
      };
    }

    return response;
  } catch (error) {
    console.error(`오류: ${error.message}`);
    return {
      fulfillmentMessages: [
        {
          text: {
            text: [`예기치 않은 응답입니다.`]
          }
        }
      ]
    };
  }
}





// 버스 
function buslist_load() {
  try {
    getBusData(auth_global, SPREADSHEET_ID, (error, busList) => {
      if (error) {
        console.error(error);
        return { error: 'Internal Server Error' };
      } else {

        return { busList: busList };
      }
    });
  } catch (error) {
    console.error(error);
    return { error: 'Internal Server Error' };
  }
}


function buslist_save(busList) {
  const values = busList.reduce((acc, bus) => {
    acc.push([String(bus.bus_no), String(bus.bus_url)]);
    return acc;
  }, [['bus_no', 'bus_url']]);

  try {
    writeToGoogleSheets(auth_global, SPREADSHEET_ID, '버스!A2:B', values, (error) => {
      if (error) {
        return { message: 'Error saving bus list' };
      } else {
        return { message: 'Bus list saved successfully' };
      }
    });
  } catch (error) {
    return { message: 'Error saving bus list' };
  }
}


async function buscity(body, session, outputContexts) {
  try {
    const values = await readFromGoogleSheets(auth_global, SPREADSHEET_ID, '버스!A2:B');

    if (values && values.length > 0) {
      values.sort((a, b) => {
        const busNoA = a[0];
        const busNoB = b[0];
        return busNoA.localeCompare(busNoB, 'en', { numeric: true });
      });

      const uniqueLabels = new Set();
      let buttons = [];

      values.forEach(row => {
        let busNo = row[0];
        const label = busNo;

        if (busNo.includes('_1')) {
          busNo = busNo.replace('_1', '') + '(평일)';
        } else if (busNo.includes('_2')) {
          busNo = busNo.replace('_2', '') + '(주말)';
        } else if (busNo.includes('_3')) {
          busNo = busNo.replace('_3', '') + '(일요일)';
        }

        if (!uniqueLabels.has(label)) {
          uniqueLabels.add(label);
          const busUrls = values.filter(row => row[0] === label).map(row => row[1]);

          buttons.push({
            'type': 'button',
            'icon': {
              'type': 'chevron_right',
              'color': '#FF9800'
            },
            'text': busNo + `번`,
            'link': busUrls.length > 0 ? busUrls[0] : '#'
          });
        }
      });
      


      return {
        fulfillmentMessages: [
          {
            payload: {
              richContent: [
                [
                  {
                    "type": "description",
                    "title": "🚍버스를 선택해주세요🚍"
                  },
                  {
                    type: "button",
                    "icon": {
                      "type": "chevron_right",
                      "color": "#000000"
                    },
                    event: {
                      name: "bus",
                      parameters: {},
                      languageCode: "ko"
                    },
                    text: "뒤로가기"
                  }
                ],
                buttons
              ]
            }
          }
        ]
      };
    } else {
      return {
        fulfillmentMessages: [
          {
            text: {
              text: [
                `데이터를 가져올 수 없습니다.`
              ]
            }
          }
        ]
      };
    }
  } catch (error) {
    return {
      fulfillmentMessages: [
        {
          text: {
            text: [
              `예기치 않은 오류가 발생했습니다.`
            ]
          }
        }
       ]
     };
   };
}





async function bus_city_print(busNo, values) {
  try {
    let busUrls = [];

    if (busNo.includes('-')) {
      // busNo에 '-'가 포함된 경우
      busUrls = values.filter(row => {
        const busNoValue = row[0];
        return busNoValue.includes(busNo);
      }).map(row => row[1]);
    } else {
      // busNo에 '-'가 포함되지 않은 경우
      busUrls = values.filter(row => {
        const busNoValue = row[0];
        return busNoValue.startsWith(busNo) && !busNoValue.includes('-');
      }).map(row => row[1]);
    }

    const items = busUrls.map(bus_url => ({
      payload: {
        richContent: [
          [
            {
              type: "image",
              rawUrl: bus_url,
              accessibilityText: "Example logo"
            },
            {
              type: "chips",
              options: [
                {
                  event: {
                    name: "main",
                    parameters: {},
                    languageCode: "ko"
                  },
                  text: "홈으로"
                }
              ]
            }
          ]
        ]
      },
      description: "썸네일과 실제 이미지가 다를 수도 있습니다. 링크를 통해 확인해주세요.",
      thumbnail: {
        imageUrl: bus_url,
        fixedRatio: true,
        link: {
          web: bus_url
        }
      }
    }));

    const response = {
      version: "2.0",
      template: {
        outputs: [
          {
            carousel: {
              type: "basicCard",
              items: items
            }
          }
        ],
        quickReplies: [
          {
            action: "block",
            label: "뒤로가기",
            blockId: "661bb3131322de4469f99a09"
          }
        ]
      }
    };
    return response;
  } catch (error) {

    const response = {
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "예기치 않은 응답입니다."
            }
          }
        ]
      }
    };

    return response;
  }
}

app.post('/bus_city_print', async (req, res) => {
  console.log('버스 도시 프린트 요청 수신'); // 요청 수신 로그 확인
  const busNo = req.body.queryResult.parameters.busNo;
  const values = req.body.queryResult.parameters.values;
  const response = await bus_city_print(busNo, values);
  res.json(response);
});









app.listen(port, () => {
});

app.post('/example', async (req, res) => {
  try {
    let response;

    res.json(response);
  } catch (error) {
    console.log(error)
    response = {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "simpleText": {
              "text": `예기치 않은 응답입니다.`
            }
          }
        ],

      }
    }
    res.json(response);
  }
});