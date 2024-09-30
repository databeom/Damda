const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    images: { type: [String], required: true } // 이미지 배열 추가
});


const Course = mongoose.model('Course', CourseSchema);
module.exports = Course;