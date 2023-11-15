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


//insertExcelData(); // 엑셀 데이터 DB에 저장

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


// index.html에서 받은 데이터 DB에서 검색
app.post('/search', async function (req, res) {
    try {
        var values = await runScript(req.body); // 프로미스 완료 대기

        // 검색된 모든 이미지 URL을 저장할 배열
        var allImageURLs = [];

        // 검색어 배열이 비어 있는지 확인
        if (values.length === 0) {
            // 적절한 처리를 추가 (예: 오류 메시지를 클라이언트에 반환)
            res.status(400).send('No search terms provided.');
            return;
        }

        // 모든 검색어에 대한 조건을 AND 연산으로 조합
        var conditions = [];
        var searchTerms = values.split(' '); // 공백으로 구분된 검색어를 배열로 분리

        // 각 검색어에 대한 값 배열 구성
        var valuesArray = searchTerms.map(function (term) {
            return '%' + term + '%';
        });

        //중복되는 값 제거
        valuesArray = valuesArray.filter(function (item, pos) {
            return valuesArray.indexOf(item) === pos;
        });

        // '%\r\n%' 값을 제외
        valuesArray = valuesArray.filter(function (value) {
            return value !== '%\r\n%';
        });
        
        for (var i = 0; i < valuesArray.length; i++) {
            conditions.push('tags LIKE ?');
        }

        // 모든 조건을 AND 연산으로 결합하여 쿼리 생성
        var sql = 'SELECT image_url FROM images WHERE ' + conditions.join(' AND ');

        console.log('###########검색어############ : ' + valuesArray + '\n검색어 갯수 : '+ valuesArray.length);

        // 로그에 쿼리 출력
        console.log('#########실행된 쿼리######### : ' + sql);

        // 검색어 배열이 비어 있지 않은 경우에만 SQL 쿼리 실행
        if (valuesArray.length > 0) {
            // Replace placeholders in the SQL query with actual values
            sql = sql.replace(/tags LIKE \?/g, 'tags LIKE ? AND');
            sql = sql.slice(0, -4); // Remove the trailing ' AND'

            // SQL 쿼리 실행
            connection.query(sql, valuesArray, function (error, results) {
                if (error) {
                    console.error('SQL error: ' + error.message);
                    res.status(500).send('Internal Server Error');
                    return;
                }
                res.send(results);
                console.log('##########검색 결과########## :' + JSON.stringify(results));
            });
        }
    } catch (error) {
        console.error('Error: ' + error.message);
        res.status(500).send('Internal Server Error');
    }
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
