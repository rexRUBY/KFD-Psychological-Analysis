const express = require('express');
const bodyParser = require('body-parser');
const database = require('mysql2');
const readXlsxFile = require('read-excel-file/node');

const app = express();

// 정적 파일 제공
const path = require('path');
const publicDirectoryPath = path.join(__dirname, './');
app.use(express.static(publicDirectoryPath));

// body-parser 미들웨어 설정
app.use(bodyParser.json()); // JSON 데이터를 파싱
app.use(bodyParser.urlencoded({ extended: false })); // URL-encoded 데이터를 파싱

// DB 연결
var connection = database.createConnection({
    host: 'svc.sel5.cloudtype.app',
    port: 30376,
    user: 'root',
    password: 'dlsrhdwlsmd00!',
    database: 'kfd_db'
  });
//svc.sel5.cloudtype.app:30376
// DB 연결 확인
connection.connect(function (err) {
    if (err) {
        console.error('mysql connection error');
        console.error(err);
        throw err;
    } else {
        console.log("DB connected");
    }
});

// 엑셀에 저장된 데이터 DB에 삽입
var url = '';
var tag = '';
var idx = 0;
readXlsxFile("./label.xlsx").then((rows) => {
    for (let i = idx; i < rows.length; i++) {
        if (i !== 0) {
            url = rows[i][1];
            tag = rows[i][2];
            // DB에 데이터 삽입
            var sql = 'INSERT INTO images (image_url, tags) VALUES (?, ?)';
            var values = [url, tag];
            connection.query(sql, values, function (error) {
                if (error) {
                    console.error('SQL error: ' + error.message);
                    return;
                }
                console.log('Data inserted successfully');
            });
            idx++;
        }
    }
});

// index.html에서 받은 데이터 DB에서 검색
app.post('/search', function (req, res) {
    var length = req.body.length;
    var values = req.body;
    
    // 검색된 모든 이미지 URL을 저장할 배열
    var allImageURLs = [];

    for (var i = 0; i < length; i++) {
        var sql = 'SELECT image_url FROM images WHERE tags LIKE ?';
        var value = ['%' + values[i] + '%'];
        connection.query(sql, value, function (error, results) {
            if (error) {
                console.error('SQL error: ' + error.message);
                return;
            }
            // 한 번의 쿼리 결과를 allImageURLs 배열에 추가
            allImageURLs.push(results);

            // 모든 쿼리가 완료되면 한 번에 응답을 보냅니다.
            if (allImageURLs.length === length) {
                res.send(allImageURLs);
                console.log('검색 결과: ' + JSON.stringify(allImageURLs));
            }
        });
    }
});


// 서버 실행
const port = 3000; // 포트 설정
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
