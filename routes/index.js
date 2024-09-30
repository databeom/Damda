// routes/index.js
const express = require('express');
const router = express.Router();
const Map = require('../models/Map'); // 모델 불러오기

// 홈 페이지 라우트
router.get('/', async (req, res) => {
    try {
        // 무작위로 15개의 맵 데이터 가져오기
        const maps = await Map.aggregate([{ $sample: { size: 15 } }]);
        res.render('home', { maps }); // 'home' 템플릿에 데이터를 전달
    } catch (error) {
        res.status(500).send('서버 오류');
    }
});

module.exports = router;
