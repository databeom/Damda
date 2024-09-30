const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session'); 
const indexRouter = require('./routes/index'); // 라우터 등록
const Map = require('./models/Map'); // Map 모델 import
const Course = require('./models/Course'); // course.js 경로가 맞는지 확인
const app = express();
const PORT = process.env.PORT || 3000;
const { MongoClient } = require('mongodb');
const { spawn } = require('child_process'); // child_process 모듈 추가

require('dotenv').config();

app.use(cors());

// 몽고DB 연결
mongoose.connect(process.env.mongoURL, {
});



// 설정: EJS를 템플릿 엔진으로 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// JSON과 URL-encoded 형식의 요청 본문을 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET, // .env 파일에서 비밀 키를 가져옴
  resave: false,
  saveUninitialized: true,
}));

// 정적 파일 제공: public 폴더에서 정적 파일을 제공
app.use(express.static(path.join(__dirname, 'public')));

// 라우터 등록
app.use('/', indexRouter); // 홈 페이지 라우터 등록

// 라우트: 이미지 데이터 API
app.get('/api/maps', async (req, res) => {
  const location = req.query.location; // 지역 필터링을 위한 쿼리 파라미터

  try {
    let query = {};
    if (location) {
      // 광주일 경우 "광주광역시" 및 그 구들로 매칭하고, 경기도 광주시를 제외
      if (location === '광주') {
        query = { addr: { $regex: /^광주광역시|광주광역시의 구/, $options: 'i' } }; // 광주광역시 및 그 구들 포함
      } else if (location === '대구') {
        query = { addr: { $regex: /^대구광역시|대구광역시의 구/, $options: 'i' } }; 
      } else if (location === '부산') {
        query = { addr: { $regex: /^부산광역시|부산광역시의 구|부산광역시 해운대구/, $options: 'i' } }; 
      } else if (location === '경기도') {
        query = { addr: { $regex: /^경기도|경기도 광주시|경기/, $options: 'i' } }; 
      } else if (location === '강원도') {
        query = { addr: { $regex: /^강원도|강원특별자치도/, $options: 'i' } }; 
      } else if (location === '서울') {
        query = { addr: { $regex: /^서울시|서울특별시/, $options: 'i' } }; 
      } else if (location === '세종') {
        query = { addr: { $regex: /^세종특별자치시/, $options: 'i' } }; 
      }  else if (location === '제주도') {
        query = { addr: { $regex: /^제주특별자치도/, $options: 'i' } }; 
      } else {
        // 전라북도와 전라특별자치도 모두 포함하는 정규 표현식
        query = { addr: { $regex: new RegExp(location === '전라북도' ? '전라북도|전북특별자치도' : location, 'i') } };
      }
    }

    // 쿼리로 필터링된 데이터 가져오기
    const filteredMaps = await Map.find(query);

    // 경기도 광주시 제외
    const maps = filteredMaps.filter(map => map.addr !== '경기도 광주시');

    // 필터링된 데이터가 9개 이상일 경우에만 무작위로 9개 선택
    let selectedMaps;
    if (maps.length >= 15) {
      selectedMaps = maps.sort(() => 0.5 - Math.random()).slice(0, 15); // 무작위로 9개 선택
    } else {
      selectedMaps = maps; // 부족할 경우, 필터링된 모든 데이터 반환
    }

    res.json({ maps: selectedMaps });
  } catch (error) {
    res.status(500).json({ error: '데이터를 가져오는 데 실패했습니다.' });
  }
});

app.post('/addCourse', (req, res) => {
  const courseTitle = req.body.title;
  const lot = req.body.mapx;
  const lat = req.body.mapy;
  const imageUrl = req.body.firstimage;
  const ad = req.body.addr;
  const gra = req.body.grade;
  const rev = req.body.review;
  const write = req.body.작가;
  req.session.courseTitle = courseTitle; // 세션에 코스 제목 저장
  req.session.lot = lot;
  req.session.lat = lat;
  req.session.imageUrl = imageUrl;
  req.session.ad = ad;
  req.session.gra = gra;
  req.session.rev = rev;
  req.session.write = write;
  res.json({ success: true });
});

app.post('/deleteCourses', (req, res) => {
  // 세션에서 courseData 초기화
  req.session.courseData = []; // 세션 초기화
  res.json({ success: true }); // 클라이언트에게 성공 응답
});



app.get('/map', (req, res) => {
  // 기존 courseData가 없으면 빈 배열로 초기화
  if (!req.session.courseData) {
      req.session.courseData = [];
  }

  // 현재 코스 정보를 새롭게 추가
  const newCourse = {
      title: req.session.courseTitle,
      mapy: req.session.lot,
      mapx: req.session.lat,
      firstimage: req.session.imageUrl
  };

  // 새로운 코스 정보를 배열에 추가
  req.session.courseData.push(newCourse);

  // 모든 코스 정보 전달
  res.render('map', {
      KAKAO_MAP_APPKEY: process.env.KAKAO_MAP_APPKEY, 
      map: req.session.courseData // 모든 코스 정보를 전달
  });
});



app.post('/saveCourse', async (req, res) => {
  try {
      const { title, images } = req.body;

      const newCourse = new Course({
          title,
          images // 추가된 첫 번째 이미지
      });

      await newCourse.save();
      res.json({ success: true });
  } catch (error) {
      console.error("MongoDB에 저장 실패:", error);
      res.status(500).json({ success: false, message: '저장 실패' });
  }
});


app.get('/search', (req, res) => {
  res.render('search'); // search.ejs 템플릿 렌더링
});

// POST 요청 처리: 검색어를 Python 스크립트로 전달
app.post('/search', (req, res) => {
  const searchTerm = req.body.searchTerm;

  const pythonProcess = spawn('C:/Users/byulh/AppData/Local/Programs/Python/Python312/python.exe', 
    ['C:/Users/byulh/OneDrive/바탕 화면/공모전/montrip2/region.py'], 
    { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
  );

  pythonProcess.stdin.write(`${searchTerm}\n`);
  pythonProcess.stdin.end();

  let outputData = '';

  pythonProcess.stdout.on('data', (data) => {
    outputData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    res.status(500).json({ error: data.toString() });
  });

  pythonProcess.on('close', (code) => {
    if (code === 0) {
      try {
        const jsonOutput = JSON.parse(outputData); // JSON 파싱
        res.json(jsonOutput);
      } catch (error) {
        res.status(500).json({ error: 'Invalid JSON response from Python script.' });
      }
    } else {
      res.status(500).json({ error: `Python process exited with code ${code}` });
    }
  });
});

// 서버 측 코드
app.post('/update-course', (req, res) => {
  req.session.courseTitle = req.body.title;
  req.session.lot = req.body.mapy;
  req.session.lat = req.body.mapx;
  req.session.imageUrl = req.body.firstimage;
  
  res.json({ message: '코스 정보가 저장되었습니다.' });
});



app.get('/choice', (req, res) => {
  const mapData = {
    title: req.session.courseTitle,
    firstimage: req.session.imageUrl,
    addr : req.session.ad,
    grade : req.session.gra,
    review : req.session.rev,
    mapy: req.session.lot,
    mapx: req.session.lat,
    write: req.session.write
  };
  res.render('choice', {
    map: mapData
  });// search.ejs 템플릿 렌더링
});


// MongoDB 연결 URI
const uri = process.env.mongoURL; // MongoDB 서버 주소 및 포트
const client = new MongoClient(uri);
const dbName = 'test'; // 사용할 데이터베이스 이름
const collectionName = 'maps'; // 사용할 컬렉션 이름
// MongoDB에서 attractions 데이터 가져오기
async function fetchAttractions() {
  try {
      await client.connect(); // MongoDB에 연결
      const database = client.db(dbName); // 데이터베이스 선택
      const collection = database.collection(collectionName); // 컬렉션 선택
      const attractions = await collection.find({}).toArray(); // 데이터 가져오기
      return attractions;
  } catch (error) {
      console.error('MongoDB 연결 오류:', error);
      throw error; // 오류를 상위 호출로 전달
  } finally {
      await client.close(); // 연결 종료
  }
}

// 관광지 데이터 제공 API
app.get('/attractions', async (req, res) => {
  try {
      const attractions = await fetchAttractions();
      res.json(attractions); // 클라이언트에 데이터 전송
  } catch (error) {
      console.error('Error fetching attractions:', error);
      res.status(500).send('서버 오류'); // 에러 처리
  }
});

app.get('/course', async (req, res) => {
  try {
      const courses = await Course.find(); // 데이터베이스에서 코스 가져오기
      const formattedCourses = courses.map(course => {
          const firstImage = course.images.length > 0 ? course.images[0] : '/images/default-image.png'; // 첫 번째 이미지 설정
          return {
              title: course.title,
              firstimage: firstImage, // 첫 번째 이미지
              images: course.images, // 모든 이미지 배열 추가
              // 필요한 추가 데이터
          };
      });
      res.render('course', { courses: formattedCourses }); // course.ejs에 데이터 전달
  } catch (err) {
      res.status(500).send(err);
  }
});




// 서버 시작
app.listen(PORT, () => {
});
