const express = require('express')
const app = express() // web framework
const serveStatic = require('serve-static') // static files
const basicauth = require('basicauth-middleware'); // session
const _ = require('underscore'); // js object manipulation
const mysql = require('mysql'); // db
const exphbs = require('express-handlebars'); // template engine
const bodyParser = require('body-parser')
const multer = require('multer') // file upload
const execSync = require('child_process').execSync

app.use(basicauth('lloopp', 'pazzword'));
app.use(express.static('public'))
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// LOAD DATA LOCAL INFILE '/Users/michaelmruta/Desktop/Succession Planning/Total_Results_Sample-2-2.csv' INTO TABLE `profiles` IGNORE 1 LINES
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    // password: '09953132468',
    database: 'succession_planning'
});

connection.connect();

function createQueryFilter(q) {
    if (q.tn || q.tp || q.tc || q.ta || q.tpl || q.plg) {
        tn = q.tn ? `%${q.tn}%` : "%%"
        tp = q.tp ? `%${q.tp}%` : "%%"

        tc = q.tc || []
        ta = q.ta || []
        tpl = q.tpl || []
        plg = q.plg || []

        args = [tn, tp]

        var where = "WHERE `TARGET NAME` LIKE ? AND `T-POSITION` LIKE ? "

        if (tc.length) {
            where += "AND `GROUP PROXIMITY CATEGORY` IN (?) "
            args.push(tc)
        }
        if (ta.length) {
            // for (var i = 0; i < ta.length; i++) {
            //     ta[i] = parseInt(ta[i])
            // }
            where += "AND `4. FUNCTIONAL AFFINITY SCORE` IN (?) "
            args.push(ta)
        }
        if (tpl.length) {
            where += "AND `T-POSITION LEVEL` IN (?) "
            args.push(tpl)
        }
        if (plg.length) {
            where += "AND `Position Level Gap` IN (?) "
            args.push(plg)
        }

        return [where, args]
    } else {
        return ["", []]
    }
}

app.get('/listTargetPositions', function(req, res) {
    connection.query({
        sql: "SELECT DISTINCT(`T-POSITION`) FROM profiles",
        timeout: 40000,
    }, function(error, results, fields) {
        if (error) return res.json(error);

        res.json(results)
    })
});

app.get('/listTargetNames', function(req, res) {
    var n = createQueryFilter(req.query)
    connection.query({
        sql: "SELECT DISTINCT(`TARGET NAME`) as TARGET FROM profiles " + n[0] + "ORDER BY TARGET",
        timeout: 40000,
        values: n[1]
    }, function(error, results, fields) {
        if (error) return res.json(error);
        res.json(results)
    })
});

// target position
app.get('/getTargetPosition', function(req, res) {
    var tp = req.query.tp
    connection.query({
        sql: "SELECT * FROM profiles WHERE `T-POSITION` = ?",
        timeout: 40000,
        values: [tp]
    }, function(error, results, fields) {
        if (error) return res.json(error);
        res.json(results)
    })
});

// target profile
app.get('/getTargetProfile', function(req, res) {
    var tn = req.query.tn
    connection.query({
        sql: "SELECT * FROM profiles WHERE `TARGET NAME` = ? LIMIT 0,1",
        timeout: 40000,
        values: [tn]
    }, function(error, results, fields) {
        if (error) return res.json(error);
        res.json(results)
    })
});


// table 1
app.get('/getAllCandidates', function(req, res) {
    var n = createQueryFilter(req.query)
    if(n[0].length == 0 && n[1].length == 0) {
        res.json([])
        return;
    }
    connection.query({
        sql: `SELECT * FROM profiles ` + n[0] + 'ORDER BY `Total Candidate Score` DESC',
        timeout: 40000,
        values: n[1]
    }, function(error, results, fields) {
        // console.log(results)
        if (error) return res.json(error);
        res.json(results)
    })
})


app.get('/getCountPerCandidates', function(req, res) {
    connection.query({
        sql: 'SELECT count(*) as c, `CANDIDATE NAME` FROM profiles GROUP BY `CANDIDATE NAME`',
        timeout: 40000,
    }, function(error, results, fields) {
        // console.log(results)
        if (error) return res.json(error);
        res.json(results)
    })
})


// table 2
app.get('/positions', function(req, res) {
    // make target the candidate
    var cn = req.query.cn
    console.log(cn)
    connection.query({
        sql: "SELECT * FROM profiles WHERE `CANDIDATE NAME` = ? ORDER BY `Total Candidate Score` DESC",
        timeout: 40000,
        values: [cn]
    }, function(error, results, fields) {
        if (error) return res.json(error);
        res.json(results)
    })
});

// profile data
app.get('/candidate', function(req, res) {
    var target = req.query.target
    var candidate = req.query.candidate
    connection.query({
        sql: "SELECT * FROM profiles WHERE `TARGET NAME` = ? AND `CANDIDATE NAME` = ?",
        timeout: 40000,
        values: [target, candidate]
    }, function(error, results, fields) {
        if (error) return res.json(error);
        results = Object.values(JSON.parse(JSON.stringify(results)))
        var c = results[0]

        connection.query({
            sql: "SELECT * FROM employee WHERE `FULL NAME` = ?",
            timeout: 40000,
            values: [target]
        }, function(error, results, fields) {

            try {
                results = Object.values(JSON.parse(JSON.stringify(results)))
                c = Object.assign(c, results[0])

                if (c) {

                    // prepare display data
                        c['AGE'] = c['AGE']
                        var dob = new Date('12-Oct-60')
                        c['AGE'] = ((new Date() - new Date(dob)) / 1000 / 60 / 60 / 24 / 365.25).toFixed(2)

                        c["C-COURSE"] = c["C-COURSE"].replace(/\,/g, "<br />")
                        c['RETIREMENT DUE'] = parseInt(c['RETIREMENT YEAR']) - (new Date()).getFullYear()

                    res.json({ c: c })
                } else {
                    res.json({})
                }
            } catch (e) { 
                console.log(e) 
                res.json({})
            }

        });

    })
})

// remarks
// alter table meta add primary key(`TARGET NAME`,`CANDIDATE NAME`);
app.get('/meta', function(req, res) {
    var target = req.query.target
    var candidate = req.query.candidate
    connection.query({
        sql: "SELECT * FROM meta WHERE `TARGET NAME` = ? AND `CANDIDATE NAME` = ?",
        timeout: 40000,
        values: [target, candidate]
    }, function(error, results, fields) {
        if (error) return res.json(error);
        results = Object.values(JSON.parse(JSON.stringify(results)))
        var t = results[0]
        res.json({ t: t })
    })
})

app.get('/remarks', function(req, res) {
    var target = req.query.tn
    var candidate = req.query.cn

    console.log(target,candidate)
    connection.query({
        sql: "SELECT * FROM meta WHERE `TARGET NAME` = ? AND `CANDIDATE NAME` = ?",
        timeout: 40000,
        values: [target, candidate]
    }, function(error, results, fields) {
        console.log(error)
        console.log(results)

        if (error) return res.json(error);
        results = Object.values(JSON.parse(JSON.stringify(results)))
        var c = results[0]
        res.json(c);
    });

});

app.post('/profile', function(req, res) {
    var target = req.body.target
    var candidate = req.body.candidate
    var remarks = req.body.remarks

    try {
        if (target && candidate && remarks) {
            connection.query({
                sql: "REPLACE INTO `meta` (`TARGET NAME`,`CANDIDATE NAME`,`Remarks`) VALUES(?,?,?) ",
                timeout: 40000,
                values: [target, candidate, remarks]
            }, function(error, results, fields) {
                if (error) return res.json(error);

                connection.query({
                    sql: "SELECT * FROM profiles WHERE `TARGET NAME` = ? AND `CANDIDATE NAME` = ?",
                    timeout: 40000,
                    values: [target, candidate]
                }, function(error, results, fields) {
                    if (error) return res.json(error);
                    results = Object.values(JSON.parse(JSON.stringify(results)))
                    var c = results[0]
                    c["T-COURSE"] = c["T-COURSE"].replace(/\,/g, "<br />")
                    // console.log(`SELECT * FROM profiles WHERE \`TARGET NAME\` = ? AND \`CANDIDATE NAME\` = ?`)
                    // console.log(target,candidate)

                    console.log(c)

                    res.render('candidate', { c: c })

                })

            })
        } else {
            connection.query({
                sql: "SELECT * FROM profiles WHERE `TARGET NAME` = ? AND `CANDIDATE NAME` = ?",
                timeout: 40000,
                values: [target, candidate]
            }, function(error, results, fields) {
                if (error) return res.json(error);
                results = Object.values(JSON.parse(JSON.stringify(results)))
                var c = results[0]
                c["T-COURSE"] = c["T-COURSE"].replace(/\,/g, "<br />")
                // console.log(`SELECT * FROM profiles WHERE \`TARGET NAME\` = ? AND \`CANDIDATE NAME\` = ?`)
                // console.log(target,candidate)
                res.render('candidate', { c: c })

            })
        }
    } catch (e) {
        res.json({})
    }
})

function importToTable(tables, results, cb) {

    if (tables.length > 0) {

        var table = tables.pop()
        console.log(table)
        connection.query(`truncate ${table}`, function(error, result, fields) {
            console.log(`${table} table truncated`)

            var query = `load data local infile 'uploads/${table}.csv' into table ${table}
            fields terminated by ','
            enclosed by '"'
            lines terminated by '\r'
            ignore 1 lines;`

            connection.query(query, function(error, result, fields) {
                if (error) console.log(error);
                console.log(`Done importing ${table}...`)
                results[table] = result.message.replace("5Records", "Records");
                importToTable(tables, results, cb);
            });
        });

    } else {
        cb({ results: results })
    }

}

// file import
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + ".csv");
    }
})
const upload = multer({ storage: storage })
const cpUpload = upload.fields([{ name: 'employee', maxCount: 1 }, { name: 'profiles', maxCount: 1 }])

app.post('/upload', cpUpload, function(req, res, next) {

    var tables = Object.keys(req.files)
    importToTable(tables, {}, function(results) {
        console.log(results)
        res.render('data', results)
    })

})

// profile page
app.get('/profile', function(req, res) {
    var target = req.query.target
    var candidate = req.query.candidate
    try {
        connection.query({
            sql: "SELECT * FROM profiles WHERE `TARGET NAME` = ? AND `CANDIDATE NAME` = ?",
            timeout: 40000,
            values: [target, candidate]
        }, function(error, results, fields) {
            if (error) return res.json(error);
            try {
                results = Object.values(JSON.parse(JSON.stringify(results)))
                var c = results[0]
                c["T-COURSE"] = c["T-COURSE"].replace(/\,/g, "<br />")
                // console.log(`SELECT * FROM profiles WHERE \`TARGET NAME\` = ? AND \`CANDIDATE NAME\` = ?`)
                // console.log(target,candidate)
                res.render('candidate', { c: c })
            } catch (e) {
                res.redirect("/")
            }
        });
    } catch (e) {
        res.redirect("/")
    }
})

// data page
app.get('/data', function(req, res) {
    res.render('data', { results: {} })
})

// home page
app.get('/', function(req, res) {
    res.render('index')
})

const server = app.listen(8891, function() {
    console.log('server is running, visit http://localhost:8891/')
})

server.keepAliveTimeout = 60000 * 2;
