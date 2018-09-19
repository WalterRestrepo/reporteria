//console.log("Console test");
//codepen
//node server.js ->Para correr
//npm cache clean --force
var express = require("express");
var app = express();
var path = require("path");
var mysql = require("mysql");
const application = require('./application.json')
var Sequelize = require('sequelize');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var needle = require('needle');

var Moment = require('moment-timezone'); Moment().tz('America/Bogota').format(); 
//app.use(morgan('dev'));//Debug
const sequelize = new Sequelize(application.database, application.username, application.password, {
    host: application.host,
    dialect: 'mysql'
});
var con = mysql.createConnection({
    host: "10.1.109.15",
    user: "db_reportes",
    password: "6uHsCIhZlaxc",
    database: "db_reportes"
});
//Configuramos la aplicacion
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    key: 'user_sid',
    secret: 'programacionycontrol',
    resave: false,
    saveUninitialized: false,
    cookie: { expires: 600000 }
}));
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});
var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/inicio');
    } else {
        next();
    }
};
app.get('/', sessionChecker, (req, res) => {
    res.redirect('/login');
});

app.route('/registro/actividad')
    .get(sessionChecker, (req, res) => {
        res.sendFile(__dirname + '/public/login.html');
    })
    .post((req, res) => {
        var id_actividad = req.body.id_actividad, observaciones = req.body.observaciones;
        con.query("INSERT INTO registro_actividad (id_registro, id_actividad, observaciones, fecha_hora) VALUES (?, ?, ?, CURRENT_TIMESTAMP);",
            [null, id_actividad, observaciones], function (err, result, fields) {
                if (err) throw err;
                if (result.affectedRows == 1) {
                    res.json({ resultado: 1 });
                } else {
                    res.json({ resultado: 0 });
                }
            });
    });

app.get('/inicio', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.sendFile(__dirname + '/public/inicio.html');
    } else {
        res.redirect('/login');
    }
});

app.get('/registrarReporte', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.sendFile(__dirname + '/public/registrarReporte.html');
    } else {
        res.redirect('/login');
    }
});

app.get('/revisarDatos', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.sendFile(__dirname + '/public/revisarDatos.html');
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.route('/login')
    .get(sessionChecker, (req, res) => {
        res.sendFile(__dirname + '/public/login.html');
    })
    .post((req, res) => {
        var username_ = req.body.username, password_ = req.body.password;
        needle.post('http://10.1.1.243:8888/login', { user: username_, password: password_ }, function (err, resp, body) {
            if (err) throw err;
            if (resp.statusCode == 200) {
                var jsonResponse = (body);
                req.session.user = jsonResponse.epersonal.user;
                req.session.first_name = jsonResponse.epersonal.first_name;
                req.session.last_name = jsonResponse.epersonal.last_name;
                req.session.full_name = jsonResponse.ldap.full_name;
                req.session.idUsuario = 0;
                res.redirect('/inicio');
            } else if (resp.statusCode == 403) {
                res.redirect('/loginError');
            } else {
                res.redirect('/loginError');
            }
        });
    });

app.get('/actividades/get', function (req, res) {
    var id_usuario = req.session.idUsuario;
    var consulta = "SELECT a.id_actividad, c.nombre as cliente, a.nombre as actividad";
    consulta += " FROM actividad a inner join cliente c on c.id_cliente = a.id_cliente";
    consulta += " where a.id_analista = ?";
    con.query(consulta, [id_usuario], function (err, result, fields) {
        if (err) throw err;
        res.json(result);
    });
});

app.get('/get/registroActividad', function (req, res) {
    var consulta = "select cl.nombre as Cliente, ac.nombre, ac.tiempo_ejecucion, ac.ans_hora, ac.ans_dias, an.usuario_red as analista, fr.nombre as frecuencia, ra.Observaciones, CAST(ra.fecha_hora as char) as fecha_hora";
    consulta += " from registro_actividad ra";
    consulta += " inner join actividad ac on ra.id_actividad = ac.id_actividad";
    consulta += " inner join analista an on an.id_analista = ac.id_analista";
    consulta += " inner join cliente cl on cl.id_cliente = ac.id_cliente";
    consulta += " inner join frecuencia fr on fr.id_frecuencia = ac.id_frecuencia;";
    con.query(consulta, function (err, result, fields) {
        if (err) throw err;
        res.json(result);
    });
});

app.get('/get/registroActividad/excel', function (req, res) {
    var consulta = "select cl.nombre as Cliente, ac.nombre, ac.tiempo_ejecucion, ac.ans_hora, ac.ans_dias, an.usuario_red as analista, fr.nombre as frecuencia, ra.Observaciones, CAST(ra.fecha_hora as char) as fecha_hora";
    consulta += " from registro_actividad ra";
    consulta += " inner join actividad ac on ra.id_actividad = ac.id_actividad";
    consulta += " inner join analista an on an.id_analista = ac.id_analista";
    consulta += " inner join cliente cl on cl.id_cliente = ac.id_cliente";
    consulta += " inner join frecuencia fr on fr.id_frecuencia = ac.id_frecuencia;";
    con.query(consulta, function (err, result, fields) {
        if (err) throw err;
        res.json(result);
    });
});

app.get('/fullname/get', function (req, res) {
    var username = req.session.user;
    var consulta = "SELECT id_analista FROM analista where usuario_red = ?;"
    con.query(consulta, [username], function (err, result, fields) {
        if (err) throw err;
        if (result.length == 1) {
            req.session.idUsuario = result[0].id_analista;
            res.send(req.session.full_name);
        } else {
            res.send(req.session.full_name);
        }
    });

});
app.listen(4000, function () {
    console.log("Funciona puerto 4000");
});
