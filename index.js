const express = require('express');
const bodyParser = require('body-parser');
const database = require('mysql2');
const readXlsxFile = require('read-excel-file/node');
const spawn = require('child_process').spawn;
const iconv = require('iconv-lite');
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
// insertExcelData()


// index.html에서 받은 데이터 DB에서 검색
app.post('/search', function (req, res) {
    var length = req.body.length;
    var values = req.body;
    //values = runScript(values);
    console.log('###########검색어############ : ' + values);

    // 검색된 모든 이미지 URL을 저장할 배열
    var allImageURLs = [];

    // 모든 검색어에 대한 조건을 AND 연산으로 조합
    var conditions = [];
    for (var i = 0; i < values.length; i++) {
        conditions.push('tags LIKE ?');
    }

    // 모든 조건을 AND 연산으로 결합하여 쿼리 생성
    var sql = 'SELECT image_url FROM images WHERE ' + conditions.join(' AND ');

    // 각 검색어에 대한 값 배열 구성
    var valuesArray = values.map(function (value) {
        return '%' + value + '%';
    });

    // 로그에 쿼리 출력
    console.log('#########실행된 쿼리######### : ' + sql);

    connection.query(sql, valuesArray, function (error, results) {
        if (error) {
            console.error('SQL error: ' + error.message);
            return;
        }
        res.send(results);
        console.log('##########검색 결과########## :' + JSON.stringify(results));
    });
});



// 서버 실행
const port = 3000; // 포트 설정
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


//엑셀데이터 저장
function insertExcelData() {
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
}


//파이썬 스크립트 실행
function runScript(text) {
    return new Promise((resolve, reject) => {
        const result = spawn('python', ['extract_kiwi.py', text]);
        let output = '';

        result.stdout.on('data', function (data) {
            data = iconv.decode(data, 'euc-kr');
            console.log(data.toString());
            output += data.toString();
        });

        result.stderr.on('data', function (data) {
            data = iconv.decode(data, 'euc-kr');
            console.log(data.toString());
        });

        result.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(`Python script exited with code ${code}`);
            }
        });
    });
}
