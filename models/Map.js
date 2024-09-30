// models/Map.js
const mongoose = require('mongoose');

const mapSchema = new mongoose.Schema({
    title: String,
    addr: String,
    firstimage: String,
    areacode: Number,
    sigungucode: Number,
    mapx: Number,
    mapy: Number,
    zipcode: String,
    grade: Number,
    review: Number,
    title_check: String,
    작가 : String
});

module.exports = mongoose.model('Map', mapSchema);
