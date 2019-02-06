const express = require('express')
const app = express()
const serveStatic = require('serve-static')
const basicauth = require('basicauth-middleware');
const _ = require('underscore');
const mysql = require('mysql');

app.use(basicauth('lloopp', 'pazzword'));
app.use(serveStatic('public/'))

// LOAD DATA LOCAL INFILE '/Users/michaelmruta/Desktop/Succession Planning/Total_Results_Sample-2-2.csv' INTO TABLE `profiles` IGNORE 1 LINES
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    // password: 'root',
    password: '09953132468',
    database: 'succession_planning'
});

connection.connect();

function createQueryFilter(q) {

	if(q.tn || q.tp || q.tc || q.ta || q.tpl || q.plg) {
		tn = q.tn ? `%${q.tn}%` : "%%"
		tp = q.tp ? `%${q.tp}%` : "%%"
		
        tc = q.tc || []
        ta = q.ta || []		
        tpl = q.tpl || []
        plg = q.plg || []

        args = [tn,tp]

        var where = "WHERE LOWER(`TARGET NAME`) LIKE ? AND `T-POSITION` LIKE ? "
        
        if(tc.length) {
            where += "AND `GROUP PROXIMITY CATEGORY` IN (?) "
            args.push(tc)
        }
        if(ta.length) {
            // for (var i = 0; i < ta.length; i++) {
            //     ta[i] = parseInt(ta[i])
            // }
            where += "AND `4. FUNCTIONAL AFFINITY SCORE` IN (?) " 
            args.push(ta)
        }
        if(tpl.length) {
            where += "AND `T-POSITION LEVEL` IN (?) "
            args.push(tpl)
        }
        if(plg.length) {
            where += "AND `Position Level Gap` IN (?) "
            args.push(plg)
        }

		return [where, args]
	} else {
		return ["",[]]
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
    console.log(n)
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
    connection.query({
        sql: "SELECT * FROM profiles WHERE LOWER(`CANDIDATE NAME`) = ? ORDER BY `Total Candidate Score` DESC",
        timeout: 40000,
        values: [cn]
    }, function(error, results, fields) {
        if (error) return res.json(error);
        res.json(results)
    })

});


app.listen(8891, function() {
    console.log('server is running, visit http://localhost:8891/')
})
