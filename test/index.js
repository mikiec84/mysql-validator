
/*
    Execute these commands before running the tests:

    create user 'liolio'@'localhost' identified by 'karamba';
    grant all on `mysql-validator`.* to 'liolio'@'localhost';
*/

var fs = require('fs'),
    should = require('should');
require('colors');

var mysql = require('mysql'),
    c = mysql.createConnection({
        user: 'liolio',
        password: 'karamba',
        typeCast: false,
        multipleStatements: true
    });

var validator = require('../lib/validator');


function runTest (tests, type, valid, cb) {
    var sql = '';
    for (var i=0; i < tests.length; i++) {
        sql += 'insert into `datatypes` (`'+type+'`) values ("'+tests[i]+'");';
    }
    c.query(sql, function (err, result) {
        if (err) return cb(err);
        c.query('select `'+type+'` from `datatypes`;', function (err, rows) {
            if (err) return cb(err);
            if (valid) console.log('\t'+type.blue.bold);
            console.log(valid ? '\tvalid'.magenta : '\tinvalid'.magenta);

            for (var i=0; i < tests.length; i++) {
                var err = validator.check(tests[i], type),
                    value = rows[i][type].toString('utf8');
                // print
                console.log('\t'+
                    (!err ? value.green : value.red),
                    tests[i].yellow, 
                    (!err ? 'valid'.green : err.message.red)
                );
                // test
                valid 
                    ? should.equal(err, null) 
                    : err.should.be.an.instanceOf(Error);
            }
            
            c.query('delete from `datatypes`;', function (err, result) {
                if (err) return cb(err);
                cb();
            });
        });
    });
}


describe('data type', function () {
    before(function (done) {
        var schema = fs.readFileSync('./test/fixtures/schema.sql', 'utf8');
        c.query(schema, function (err, rows) {
            if (err) return done(err);
            done();
        });
    });

    it('should be valid', function (done) {
        console.log('');
        var TESTS = [
            { data: require('./type/date').TEST, title: 'DATE, YEAR' },
            { data: require('./type/time').TEST, title: 'TIME' },
            { data: require('./type/datetime').TEST, title: 'DATETIME' },
            { data: require('./type/int').TEST, title: 'BIGINT, INT, MEDIUMINT, SMALLINT, TINYINT, BIT' },
            { data: require('./type/float').TEST, title: 'FLOAT, DOUBLE, DECIMAL' },
            { data: require('./type/char').TEST, title: 'CHAR, VARCHAR, TINYTEXT' }
        ];
        var TEST = {},
            keys = [];
        function loopTests (index) {
            if (index == TESTS.length) {
                return done();
            }
            console.log(TESTS[index].title.cyan.bold.underline);
            TEST = TESTS[index].data;
            keys = Object.keys(TEST);
            loopTypes(0, function () {
                loopTests(++index);
            });
        }
        function loopTypes (i, cb) {
            if (i == keys.length) {
                return cb();
            }
            runTest(TEST[keys[i]].valid, keys[i], true, function (err) {
                if (err) return done(err);
                runTest(TEST[keys[i]].invalid, keys[i], false, function (err) {
                    if (err) return done(err);
                    loopTypes(++i, cb);
                });
            });
        }
        loopTests(0);
    });

    after(function (done) {
        c.query('drop schema `mysql-validator`;', function (err, rows) {
            if (err) return done(err);
            done();
        });
    });
});
