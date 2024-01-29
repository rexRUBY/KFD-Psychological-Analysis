const express = require('express');
const bodyParser = require('body-parser');
const database = require('mysql2');
const readXlsxFile = require('read-excel-file/node');
const spawn = require('child_process').spawn;
const iconv = require('iconv-lite');
const app = express();
const multer = require('multer');
const path = require('path');
require("dotenv").config();

// 정적 파일 제공
const publicDirectoryPath = path.join(__dirname, './');
app.use(express.static(publicDirectoryPath));

//insertExcelData(); // 엑셀 데이터 DB에 저장


const request = require('request');


//스파게티 코드~~ ㅎㅎ
// body-parser 미들웨어 설정
app.use(bodyParser.json()); // JSON 데이터를 파싱
app.use(bodyParser.urlencoded({ extended: false })); // URL-encoded 데이터를 파싱
//app.use(bodyParser.text()); // 텍스트 데이터를 파싱


app.post('/results', async function (req, res) {
    try {
        const request = req.body;
        var results = [];
        for(var i = 0; i < request.length; i++){
            if(request[i] == '' || request[i] == ' ') 
                results[i] = ' ';
            else {
                results[i] = await transfer(request[i]);
                results[i] = results[i].replace(/(\r\n|\n|\r)/gm, "");
            }
        }
        res.send(results);
    } catch (error) {
        console.error('Error: ' + error.message);
        res.status(500).send('Internal Server Error');
    }
});


/*
// DB 연결
var connection = database.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: 'kfd',
    waitForConnections: true
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
*/



// Multer 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'img/'); // 파일을 저장할 폴더 지정
    },
    filename: function (req, file, cb) {
        // 파일명 중복을 피하기 위해 현재 시간을 사용하여 파일명 생성
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

// 이미지 업로드 처리
app.post('/upload', upload.single('image'), (req, res) => {
    res.send('이미지 업로드 완료!');
});




// index.html에서 받은 데이터 DB에서 검색
app.post('/search', async function (req, res) {
    try {
        var valuesString = await runScript(req.body); // 프로미스 완료 대기

        // 추가된 로그
        console.log('####### 반환된 데이터 ####### :' + valuesString);

        // 문자열을 공백으로 나누어 배열로 변환
        var valuesArray = valuesString.split(/\s+/);

        // 검색된 모든 이미지 URL을 저장할 배열
        var allImageURLs = [];

        // 검색어 배열이 비어 있는지 확인
        if (!Array.isArray(valuesArray) || valuesArray.length === 0) {
            // 적절한 처리를 추가 (예: 오류 메시지를 클라이언트에 반환)
            res.status(400).send('Invalid search terms provided.');
            return;
        }

        // 각 검색어에 대한 조건을 AND 연산으로 조합
        var conditions = valuesArray
            .filter(function (term) {
                return term.trim() !== ''; // 빈 문자열 필터링
            })
            .map(function (term) {
                return 'tags LIKE ?';
            });

        // 중복되는 값 제거
        var uniqueValuesArray = [...new Set(valuesArray)];

        // '%\r\n%' 값을 제외
        uniqueValuesArray = uniqueValuesArray.filter(function (value) {
            return value.trim() !== '%\r\n%';
        });

        // 각 검색어에 '%' 추가
        uniqueValuesArray = uniqueValuesArray.map(function (value) {
            return '%' + value + '%';
        });

        // 모든 조건을 AND 연산으로 결합하여 쿼리 생성
        var sql = 'SELECT image_url FROM images WHERE ' + conditions.join(' AND ');

        console.log('###########검색어############ : ' + uniqueValuesArray);

        // 로그에 쿼리 출력
        console.log('#########실행된 쿼리######### : ' + connection.format(sql, uniqueValuesArray));


        // 검색어 배열이 비어 있지 않은 경우에만 SQL 쿼리 실행
        if (valuesArray.length > 0) {
            // SQL 쿼리 실행
            connection.query(sql, uniqueValuesArray, function (error, results) {
                if (error) {
                    console.error('SQL error: ' + error.message);
                    res.status(500).send('Internal Server Error');
                    return;
                }
                // 검색된 모든 이미지 URL을 저장
                for (let i = 0; i < results.length; i++) {
                    allImageURLs.push(results[i].image_url);
                }
                // 콘솔에 출력
                console.log('##########검색 결과########## :' + allImageURLs);
                res.send(results);
            });
        }
    } catch (error) {
        console.error('Error: ' + error.message);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/translate', async function (req, res) {
    console.log(req.body);
    var result = await  transfer(req.body);
    console.log(result);
});


//######################################################
app.post('/select', async function (req, res) {
    console.log(req.body);
    var person = req.body.person;
    if (person == 2) {
        var one = req.body.one;
        var two = req.body.two;
        var role1 = req.body.role1;
        var role2 = req.body.role2;
        console.log(one + " " + two);
        var sql = "SELECT * FROM select_images WHERE '" + role1 + "'LIKE '" + one + "' AND '" + role2 + "'LIKE '" + two + "' OR '" + role1 + "'LIKE '" + two + "' AND '" + role2 + "'LIKE '" + one + "'";
        console.log(sql);
    }
    else if (person == 3) {
        var role1 = req.body.role1;
        var role2 = req.body.role2;
        var role3 = req.body.role3;
        var one = req.body.one;
        var two = req.body.two;
        var three = req.body.three;

        var sql = "SELECT * FROM select_images WHERE '" + role1 + "'LIKE '" + one + "' AND '" + role2 + "'LIKE '" + two + "' AND '" + role3 + "'LIKE '" + three + "'";
        console.log(sql);

        // 쿼리 실행
        connection.query(sql, function (error, results) {
            if (error) {
                console.error('SQL error: ' + error.message);
                res.status(500).send('Internal Server Error');
                return;
            }

            // 콘솔에 출력
            console.log('##########검색 결과########## :', results);
            res.send(results);
        });
    }
    else if (person == 4) {

    }
});
//#######################################################


// 서버 실행
const port = 3000; // 포트 설정
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



// 엑셀데이터 저장
function insertExcelData() {
    var url = '';
    var tag = '';
    var idx = 0;
    readXlsxFile("./label(2).xlsx").then((rows) => {
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


// 파이썬 스크립트 실행
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


function transfer(text) {
    return new Promise((resolve, reject) => {
        const result = spawn('python', ['translation.py', text]);
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