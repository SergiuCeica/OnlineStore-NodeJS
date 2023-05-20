const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const cookieParser=require('cookie-parser');
var session = require('express-session');
const bodyParser = require("body-parser");
const app = express();
const port = 6789;
const fs = require('fs').promises;
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set("view engine", "ejs");
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);

app.use(cookieParser());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
  maxAge: 10000
  }
}));
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static("public"));
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.use("/", (req, res, next) => {
  if (!req.session.produse) {
    req.session.produse = []; // Inițializează req.session.produse dacă nu există
  }
  next(); // Continuă procesarea rutei
});
app.get("/", (req, res) => res.render('index', {username: req.session.username, rol: req.session.rol,listaProduse: req.session.produse}));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată;
async function citesteIntrebari(){
  const data= await fs.readFile("intrebari.json","utf-8");
  let intrebari = Buffer.from(data);
  return JSON.parse(intrebari);
}
async function citesteUtilizatori(){
  const data= await fs.readFile("utilizatori.json","utf-8");
  let utilizatori = Buffer.from(data);
  return JSON.parse(utilizatori);
}
app.get("/chestionar", async (req, res) => {
  var listaIntrebari = await citesteIntrebari();
  // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
  res.render("chestionar", { intrebari: listaIntrebari , username: req.session.username, rol: req.session.rol});
});
app.post("/rezultat-chestionar", async (req, res) => {
  var raspunsuri=req.body;
  var listaIntrebari = await citesteIntrebari();
  console.log(raspunsuri);
  var c=0;
  for(let prop in raspunsuri){
    for( let intr in listaIntrebari){
      if(listaIntrebari[intr].intrebare == prop){
        console.log(listaIntrebari[intr].corect + "      ---   " + raspunsuri[prop])
        if(listaIntrebari[intr].corect == raspunsuri[prop]){
          c=c+1;
        }
      }
    }
  }
  console.log('Intrebari corecte: ' + c);
  res.send('Intrebari corecte: ' + c);
});
app.get('/autentificare', (req, res) =>{
  res.clearCookie("mesajEroare");
  res.render('autentificare', { mesaj: req.cookies.mesajEroare, username: req.session.username, rol: req.session.rol});
});



app.post('/verificare-autentificare', async (req, res) =>{
  console.log("USER: ", req.body);
  let listaUtilizatori = await citesteUtilizatori();
  let username = req.body['nume'],
      password = req.body['parola'];
  var utilizator =null;
  for(i=0; i<listaUtilizatori.length;i++){
    if(listaUtilizatori[i].utilizator == username){
      utilizator = listaUtilizatori[i];
      break;
    }
  }
  if(utilizator!=null && password == utilizator.parola){
    res.cookie("numeUtilizator", utilizator.prenume);
    req.session.username = utilizator.prenume;
    req.session.rol=utilizator.rol;
    res.redirect('/');
  }
  else{
        res.cookie("mesajEroare", "Utilizator sau parola gresite!!");
        res.redirect('/autentificare');
      }
});

app.post('/logout',(req,res)=>{
  res.clearCookie("utilizator");
  req.session.destroy;
  req.session.username=undefined;
  res.redirect('/autentificare');
});

const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('cumparaturi.db', sqlite3.OPEN_READWRITE , (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the cumparaturi database.');
});

let createTable="CREATE TABLE IF NOT EXISTS produse (id_prod INTEGER PRIMARY KEY AUTOINCREMENT,nume VARCHAR(25), pret VARCHAR(25))";

var produse=[];

app.get('/creare-bd',(req,res) =>{
  db.get(createTable, [], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Baza de date creata");
  });
  res.redirect('/');
});

app.get('/inserare-bd',async (req,res) =>{

  let resetAutoIncrement = "DELETE FROM sqlite_sequence WHERE name='produse'";
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM produse;", function(err) {
      if (err) {
        return console.error(err.message);
      }
      console.log(`Baza de date curata`);
    });
    db.run(resetAutoIncrement, function(err) {
      if (err) {
        reject(err);
      } else {
        console.log(`Autoincrement resetat pentru tabela produse`);
        resolve();
      }
    });
  });
  var values = [
    ['Canon EOS 4000D', '2749,00'],
    ['Canon EOS 6D', '6499,90'],
    ['Canon EOS 250D', '3349,90'],
    ['Sony Cyber-Shot', '8899,90'],
    ['Sony DSC-HX60', '989,99'],
    ['Nikon Z 50', '4489,90'],
    ['Nikon Z6 II', '8799,99']
  ];
  
  let sql = 'INSERT INTO produse (nume,pret) VALUES ';

  for(var i=0;i<values.length-1;i++){
    sql+= '("'+values[i][0]+'","'+values[i][1]+'"),';
  }
  sql+='("'+values[values.length-1][0]+'","'+values[values.length-1][1]+'");';

  await new Promise((resolve, reject) => {
    db.run(sql, function(err) {
      if (err) {
        console.log("Aici");
        reject(err);
      } else {
        console.log(`Rows inserted ${this.changes}`);
        resolve();
      }
    });
  });
let extrageProduse = `SELECT * FROM produse`;

await new Promise((resolve, reject) => {
  db.all(extrageProduse, [], (err, rows) => {
    if (err) {
      reject(err);
    } else {
      rows.forEach((row) => {
        req.session.produse.push(row);
      });
      resolve();
    }
  });
});
  res.redirect('/');
});

app.post('/adaugare-cos',(req,res)=>{
  var data=req.body;
  if(req.session.cos){
    req.session.cos.push(data['idProdus']);
  }else{
    req.session.cos = [data['idProdus']];
  }
  console.log(req.session.cos);
  res.redirect('/');
});

app.listen(port, () =>
  console.log(`Serverul rulează la adresa http://localhost:`)
);
